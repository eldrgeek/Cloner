#!/usr/bin/env node
import { chromium } from 'playwright'
import { mkdir, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function main() {
  const url = process.argv[2]
  if (!url) {
    console.error('Usage: npm run clone -- <url>')
    process.exit(1)
  }

  const base = new URL(url)
  const slug = base.hostname.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-')
  const projectRoot = path.resolve(__dirname, '..')
  const clonesDir = path.join(projectRoot, 'src', 'clones')
  const targetDir = path.join(clonesDir, slug)
  const pagesDir = path.join(targetDir, 'pages')

  if (!existsSync(targetDir)) await mkdir(targetDir, { recursive: true })
  if (!existsSync(pagesDir)) await mkdir(pagesDir, { recursive: true })

  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto(url, { waitUntil: 'networkidle' })

  const [bodyHTML, title] = await Promise.all([
    page.evaluate(() => document.body.innerHTML),
    page.title()
  ])

  // Collect styles
  const stylesheetUrls = await page.evaluate(() => Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(l => new URL(l.href, location.href).toString()))
  const inlineStyles = await page.evaluate(() => Array.from(document.querySelectorAll('style')).map(s => s.textContent || ''))

  const rewriteCssUrls = (css, baseHref) => {
    const abs = (raw) => {
      const t = raw.trim().replace(/^['"]|['"]$/g, '')
      if (/^(data:|blob:)/i.test(t)) return t
      try { return new URL(t, baseHref).toString() } catch { return t }
    }
    // url(...) forms
    css = css.replace(/url\(([^)]+)\)/g, (m, p1) => `url(${abs(p1)})`)
    // @import '...'; and @import "...";
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
    } catch {
      // ignore fetch failures
    }
  }
  cssTexts.push(...inlineStyles)
  const combinedCss = cssTexts.join('\n\n/* ---- */\n\n')

  // Discover internal anchors (same origin) and collect unique paths
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

  // Collect same-origin asset URLs from DOM (img/src, source/src, video poster/src, audio/src, link[rel="icon"]/href)
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

  await browser.close()

  // Download same-origin assets to assets/
  const assetsDir = path.join(targetDir, 'assets')
  if (!existsSync(assetsDir)) await mkdir(assetsDir, { recursive: true })

  const importLines = []
  const mapEntries = []
  const usedNames = new Set()
  const varNameFor = (p) => {
    const baseName = 'a_' + p.replace(/[^a-zA-Z0-9]/g, '_')
    let name = baseName
    let i = 1
    while (usedNames.has(name)) { name = baseName + '_' + i++; }
    usedNames.add(name)
    return name
  }

  for (const absUrl of assetUrls) {
    try {
      const u = new URL(absUrl)
      const decodedPath = decodeURIComponent(u.pathname).replace(/^\/+/, '')
      const localPath = path.join(assetsDir, decodedPath)
      await mkdir(path.dirname(localPath), { recursive: true })
      const resp = await (await import('node-fetch')).default(absUrl)
      if (!resp.ok) continue
      const buf = Buffer.from(await resp.arrayBuffer())
      await writeFile(localPath, buf)
      const relImportPath = `./assets/${decodedPath}?url`
      const varName = varNameFor(decodedPath)
      importLines.push(`import ${varName} from '${relImportPath}'`)
      mapEntries.push(`  ${JSON.stringify(absUrl)}: ${varName}`)
    } catch {
      // ignore download errors
    }
  }

  const assetsMapTs = `${importLines.join('\n')}\n\nexport const assetMap: Record<string, string> = {\n${mapEntries.join(',\n')}\n}\n`
  await writeFile(path.join(targetDir, 'assets-map.ts'), assetsMapTs, 'utf-8')

  // Generate Landing component with local asset rewrites
const landingComponent = `import { useEffect, useRef } from 'react'
import cssText from './styles.css?raw'
import { assetMap } from './assets-map'

export default function Landing() {
  const containerRef = useRef(null as null | HTMLDivElement)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const ABS = ${JSON.stringify(base.origin)}
    const toAbs = (v: string | null) => {
      if (!v) return v
      try { return new URL(v, ABS).toString() } catch { return v }
    }
    const rewriteAttr = (el: Element, attr: 'src'|'href'|'poster') => {
      const cur = el.getAttribute(attr)
      if (!cur) return
      const abs = toAbs(cur) as string
      const mapped = (assetMap as any)[abs]
      const anyEl = el as any
      if (mapped) anyEl[attr] = mapped
      else anyEl[attr] = abs
    }
    container.querySelectorAll('img').forEach((el) => rewriteAttr(el, 'src'))
    container.querySelectorAll('source').forEach((el) => rewriteAttr(el, 'src'))
    container.querySelectorAll('video').forEach((el) => { rewriteAttr(el, 'src'); rewriteAttr(el, 'poster') })
    container.querySelectorAll('audio').forEach((el) => rewriteAttr(el, 'src'))

    // Intercept internal link clicks to keep SPA routing
    container.addEventListener('click', (ev: any) => {
      const a = ev.target?.closest?.('a[href]')
      if (!a) return
      try {
        const u = new URL(a.getAttribute('href'), ABS)
        if (u.origin === ABS) {
          ev.preventDefault()
          window.history.pushState({}, '', u.pathname)
          window.dispatchEvent(new PopStateEvent('popstate'))
        }
      } catch {}
    })
  }, [])

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: cssText }} />
      <div ref={containerRef} dangerouslySetInnerHTML={{ __html: ${JSON.stringify(bodyHTML)} }} />
    </>
  )
}
`

  // Write styles
  await writeFile(path.join(targetDir, 'styles.css'), combinedCss, 'utf-8')
  await writeFile(path.join(targetDir, 'Landing.tsx'), landingComponent, 'utf-8')

  // Generate stub components for discovered pages (excluding root path '/')
  const stubImports = []
  const routeEntries = []
  for (const p of anchorPaths) {
    const isRoot = p === '/' || p === ''
    if (isRoot) continue
    const compName = p
      .replace(/^\/+/, '')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_') || 'Page'
    const fileName = `${compName}.tsx`
    const compTsx = `export default function ${compName}(){ return <div style={{padding:24}}><h2>Stub: ${p}</h2><p>This page was discovered and stubbed.</p></div> }\n`
    await writeFile(path.join(pagesDir, fileName), compTsx, 'utf-8')
    stubImports.push({ name: compName, file: `./${slug}/pages/${fileName}` })
    routeEntries.push({ path: p, component: compName })
  }

  // Update clones/routes.ts (overwrite as a generated file)
  let routesTs = `// AUTO-GENERATED FILE. Do not edit by hand.\nimport React from 'react'\nimport Landing from './${slug}/Landing'\n${stubImports.map((s) => `import ${s.name} from '${s.file}'`).join('\n')}\n\nexport const cloneRoutes: { path: string; Component: React.ComponentType<any> }[] = [\n  { path: '/${slug}', Component: Landing },\n${routeEntries.map(r => `  { path: '${r.path}', Component: ${r.component} }`).join(',\n')}\n]\n`
  await writeFile(path.join(clonesDir, 'routes.ts'), routesTs, 'utf-8')

  // Update clones/manifest.ts
  const manifestTs = `// AUTO-GENERATED\nexport interface PageEntry { path: string; cloned: boolean }\nexport interface Manifest { baseUrl: string; landingPath: string; pages: PageEntry[] }\n\nexport const manifest: Manifest = {\n  baseUrl: ${JSON.stringify(base.origin)},\n  landingPath: '/',\n  pages: [\n    { path: '/${slug}', cloned: true },\n${anchorPaths.filter(p => p !== '/').map(p => `    { path: '${p}', cloned: false }`).join(',\n')}\n  ]\n}\n`
  await writeFile(path.join(clonesDir, 'manifest.ts'), manifestTs, 'utf-8')

  // Update clones/registry.json
  try {
    const regPath = path.join(clonesDir, 'registry.json')
    let current = []
    try {
      const data = await (await import('fs/promises')).readFile(regPath, 'utf-8')
      current = JSON.parse(data)
    } catch {}
    const entry = { slug, baseUrl: base.origin, title: title || slug }
    const idx = current.findIndex((e) => e.slug === slug)
    if (idx >= 0) current[idx] = entry
    else current.push(entry)
    await writeFile(regPath, JSON.stringify(current, null, 2), 'utf-8')
  } catch {}

  // Done
  console.log(`Cloned ${title || url} -> /${slug}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})