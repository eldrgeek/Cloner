#!/usr/bin/env node
import { chromium } from 'playwright'
import { mkdir, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function main() {
  const args = process.argv.slice(2)
  const url = args.find(a => a.startsWith('http'))
  const alsoLocal = args.includes('--also-local')
  const blockAnalytics = args.includes('--block-analytics')
  if (!url) {
    console.error('Usage: npm run clone:compare -- <url> [--also-local] [--block-analytics]')
    process.exit(1)
  }

  const base = new URL(url)
  const slug = base.hostname.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-')
  const projectRoot = path.resolve(__dirname, '..')
  const clonesDir = path.join(projectRoot, 'src', 'clones')
  const targetDir = path.join(clonesDir, slug)
  const compareDir = path.join(targetDir, 'compare')

  if (!existsSync(compareDir)) await mkdir(compareDir, { recursive: true })

  const browser = await chromium.launch()
  const context = await browser.newContext({ deviceScaleFactor: 2 })

  if (blockAnalytics) {
    const blocked = [
      'googletagmanager.com',
      'google-analytics.com',
      'g.doubleclick.net',
      'posthog.com',
      'i.posthog.com',
      'us.i.posthog.com',
      'segment.com',
      'fullstory.com',
      'hotjar.com',
      'intercom.io',
      'getkoala.com',
      'cdn.vector.co',
    ]
    await context.route('**/*', route => {
      const url = route.request().url()
      if (blocked.some(d => url.includes(d))) return route.abort('blockedbyclient')
      return route.continue()
    })
  }

  const page = await context.newPage()
  await page.goto(url, { waitUntil: 'networkidle' })

  // Capture title, HTML, stylesheets, inline styles, anchors, asset urls
  const title = await page.title()
  const bodyHTML = await page.evaluate(() => document.body.innerHTML)
  const stylesheetUrls = await page.evaluate(() => Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(l => new URL(l.href, location.href).toString()))
  const inlineStyles = await page.evaluate(() => Array.from(document.querySelectorAll('style')).map(s => s.textContent || ''))

  const rewriteCssUrls = (css, baseHref) => {
    const abs = (raw) => {
      const t = raw.trim().replace(/^['"]|['"]$/g, '')
      if (/^(data:|blob:)/i.test(t)) return t
      try { return new URL(t, baseHref).toString() } catch { return t }
    }
    css = css.replace(/url\(([^)]+)\)/g, (m, p1) => `url(${abs(p1)})`)
    css = css.replace(/@import\s+(['"][^'"]+['"])/g, (m, p1) => `@import ${JSON.stringify(abs(p1))}`)
    return css
  }

  const cssTexts = []
  for (const href of stylesheetUrls) {
    try {
      const resp = await page.request.get(href)
      if (resp.ok()) {
        const raw = await resp.text()
        cssTexts.push(rewriteCssUrls(raw, href))
      }
    } catch {}
  }
  cssTexts.push(...inlineStyles)
  const combinedCss = cssTexts.join('\n\n/* ---- */\n\n')

  const anchorPaths = Array.from(new Set((await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href]'))
    return links.map(a => {
      try { return new URL(a.getAttribute('href'), location.href).toString() } catch { return null }
    }).filter(Boolean)
  }))
    .map(h => new URL(h, url))
    .filter(u => u.hostname === base.hostname)
    .map(u => u.pathname.replace(/#.*$/, ''))
    .filter(p => p)
  ))

  const assetUrls = Array.from(new Set((await page.evaluate(() => {
    const urls = new Set()
    const toAbs = (v) => { try { return new URL(v, location.href).toString() } catch { return null } }
    const add = (v) => { const u = toAbs(v); if (u) urls.add(u) }
    document.querySelectorAll('img[src]').forEach(el => add(el.getAttribute('src')))
    document.querySelectorAll('source[src]').forEach(el => add(el.getAttribute('src')))
    document.querySelectorAll('video[src]').forEach(el => add(el.getAttribute('src')))
    document.querySelectorAll('video[poster]').forEach(el => add(el.getAttribute('poster')))
    document.querySelectorAll('audio[src]').forEach(el => add(el.getAttribute('src')))
    document.querySelectorAll('link[rel="icon"][href]').forEach(el => add(el.getAttribute('href')))
    return Array.from(urls)
  }))
    .map(h => new URL(h, url))
    .filter(u => u.hostname === base.hostname)
    .map(u => u.toString())
  ))

  // Screenshot original
  await page.screenshot({ path: path.join(compareDir, 'original.png'), fullPage: true })

  // Structural summary function
  const getStructure = async (p) => {
    return await p.evaluate(() => {
      const count = (sel) => document.querySelectorAll(sel).length
      const firstText = (sel) => {
        const el = document.querySelector(sel)
        return el ? (el.textContent || '').trim().slice(0, 120) : null
      }
      const bboxOf = (sel) => {
        const el = document.querySelector(sel)
        if (!el) return null
        const r = el.getBoundingClientRect()
        return { x: r.x, y: r.y, w: r.width, h: r.height }
      }
      const isVisible = (el) => {
        const r = el.getBoundingClientRect()
        const style = window.getComputedStyle(el)
        return r.width > 0 && r.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
      }
      const norm = (t) => (t || '').replace(/\s+/g, ' ').trim().toLowerCase()
      const sections = Array.from(document.querySelectorAll('header,main,section,footer')).slice(0, 20).map(el => ({
        tag: el.tagName.toLowerCase(),
        className: (el.getAttribute('class') || '').slice(0, 200)
      }))
      const navLinks = Array.from(document.querySelectorAll('.w-nav a, nav a')).map(a => (a.textContent || '').trim()).filter(Boolean)
      const buttons = Array.from(document.querySelectorAll('button, a[role="button"], .button')).map(b => (b.textContent || '').trim()).filter(Boolean)
      const ctas = buttons.filter(t => /demo|pricing|sign in|get a demo|view pricing/i.test(t))
      const hasWNav = !!document.querySelector('.w-nav, .navbar_link, .navbar_menu')
      const webflowScripts = Array.from(document.scripts || []).some(s => (s.src || '').includes('webflow'))

      // interactive elements and their boxes
      const interactive = Array.from(document.querySelectorAll('a[href], button, [role="button"]'))
        .filter(isVisible)
        .slice(0, 100)
        .map(el => {
          const r = el.getBoundingClientRect()
          const text = (el.textContent || '').trim().slice(0, 120)
          let href = el.getAttribute('href') || null
          try { if (href) href = new URL(href, location.href).pathname } catch {}
          return { tag: el.tagName.toLowerCase(), text, href, bbox: { x: r.x, y: r.y, w: r.width, h: r.height } }
        })

      const sectionBoxes = Array.from(document.querySelectorAll('section')).slice(0, 20).map((el, i) => {
        const r = el.getBoundingClientRect()
        return { index: i, className: (el.getAttribute('class') || '').slice(0, 120), bbox: { x: r.x, y: r.y, w: r.width, h: r.height } }
      })

      return {
        url: location.href,
        title: document.title,
        landmarks: {
          header: !!document.querySelector('header, .w-nav, nav'),
          footer: !!document.querySelector('footer'),
          heroLikely: !!document.querySelector('.hero, [class*="hero" i]')
        },
        counts: {
          h1: count('h1'), h2: count('h2'), h3: count('h3'),
          links: count('a[href]'), images: count('img'), videos: count('video'),
          sections: count('section'), buttons: buttons.length,
          navLinks: navLinks.length, navbars: count('.w-nav, nav'), dropdowns: count('.w-dropdown')
        },
        keyTexts: {
          h1: firstText('h1'),
          primaryCta: ctas[0] || null,
          navFirst: navLinks[0] || null
        },
        components: {
          hasWNav,
          hasNavbarLinkClass: !!document.querySelector('.navbar_link'),
          webflowScripts
        },
        boxes: {
          header: bboxOf('header, .w-nav, nav'),
          hero: bboxOf('.hero, [class*="hero" i]'),
          footer: bboxOf('footer')
        },
        interactive,
        sectionBoxes,
        sections
      }
    })
  }

  const originalStructure = await getStructure(page)
  await writeFile(path.join(compareDir, 'structure-original.json'), JSON.stringify(originalStructure, null, 2), 'utf-8')

  let localStructure = null
  if (alsoLocal) {
    const localUrl = `http://localhost:5173/${slug}`
    await page.goto(localUrl, { waitUntil: 'domcontentloaded' })
    await page.screenshot({ path: path.join(compareDir, 'local.png'), fullPage: true }).catch(() => {})
    localStructure = await getStructure(page)
    await writeFile(path.join(compareDir, 'structure-local.json'), JSON.stringify(localStructure, null, 2), 'utf-8')
    // Simple structural diff
    const diff = {
      urlOriginal: originalStructure.url,
      urlLocal: localStructure.url,
      counts: {},
      landmarks: {},
      notes: [],
      bboxSamples: []
    }
    for (const k of Object.keys(originalStructure.counts)) {
      diff.counts[k] = {
        original: originalStructure.counts[k],
        local: localStructure.counts[k],
        delta: localStructure.counts[k] - originalStructure.counts[k]
      }
    }
    for (const k of Object.keys(originalStructure.landmarks)) {
      diff.landmarks[k] = {
        original: originalStructure.landmarks[k],
        local: localStructure.landmarks[k],
        match: originalStructure.landmarks[k] === localStructure.landmarks[k]
      }
    }
    // Component presence checks
    diff.components = {
      hasWNav: {
        original: originalStructure.components?.hasWNav || false,
        local: localStructure.components?.hasWNav || false,
        match: (originalStructure.components?.hasWNav || false) === (localStructure.components?.hasWNav || false)
      },
      hasNavbarLinkClass: {
        original: originalStructure.components?.hasNavbarLinkClass || false,
        local: localStructure.components?.hasNavbarLinkClass || false,
        match: (originalStructure.components?.hasNavbarLinkClass || false) === (localStructure.components?.hasNavbarLinkClass || false)
      }
    }
    if (originalStructure.keyTexts.h1 && localStructure.keyTexts.h1 && originalStructure.keyTexts.h1 !== localStructure.keyTexts.h1) {
      diff.notes.push('H1 text differs')
    }
    if (Math.abs(diff.counts.links.delta) > 5) diff.notes.push('Large link count difference')
    if (!diff.landmarks.header.match) diff.notes.push('Header/Navigation landmark mismatch')
    if (!diff.landmarks.footer.match) diff.notes.push('Footer landmark mismatch')
    if (!diff.components.hasWNav.match) diff.notes.push('Missing Webflow nav (.w-nav) or equivalent')

    // Bounding box comparisons for interaction components
    const byKey = (arr) => {
      const m = new Map()
      for (const it of arr) {
        const key = (it.href ? `href:${it.href}` : `text:${(it.text||'').toLowerCase()}`)
        if (!m.has(key)) m.set(key, it)
      }
      return m
    }
    const oMap = byKey(originalStructure.interactive || [])
    const lMap = byKey(localStructure.interactive || [])
    const keys = new Set([...oMap.keys()].slice(0, 50)) // limit to first 50
    for (const k of keys) {
      const o = oMap.get(k)
      const l = lMap.get(k)
      if (!o || !l) continue
      const dx = Math.abs((l.bbox?.x||0) - (o.bbox?.x||0))
      const dy = Math.abs((l.bbox?.y||0) - (o.bbox?.y||0))
      const dw = Math.abs((l.bbox?.w||0) - (o.bbox?.w||0))
      const dh = Math.abs((l.bbox?.h||0) - (o.bbox?.h||0))
      diff.bboxSamples.push({ key: k, original: o.bbox, local: l.bbox, deltas: { dx, dy, dw, dh } })
      if (dx > 20 || dy > 20 || dw > 40 || dh > 40) {
        diff.notes.push(`BBox mismatch for ${k} (dx:${dx}, dy:${dy}, dw:${dw}, dh:${dh})`)
      }
    }

    await writeFile(path.join(compareDir, 'compare.json'), JSON.stringify(diff, null, 2), 'utf-8')
  }

  await browser.close()

  // Write artifacts
  await writeFile(path.join(compareDir, 'original.html'), bodyHTML, 'utf-8')
  await writeFile(path.join(compareDir, 'original.styles.css'), combinedCss, 'utf-8')
  const report = {
    title: title || slug,
    baseUrl: base.origin,
    when: new Date().toISOString(),
    anchors: anchorPaths,
    sameOriginAssetsCount: assetUrls.length,
    sampleAssets: assetUrls.slice(0, 50)
  }
  await writeFile(path.join(compareDir, 'report.json'), JSON.stringify(report, null, 2), 'utf-8')

  console.log(`Captured original artifacts for ${title || url} in src/clones/${slug}/compare/`)
  if (alsoLocal) console.log(`Also captured local structure and simple diff in src/clones/${slug}/compare/`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
