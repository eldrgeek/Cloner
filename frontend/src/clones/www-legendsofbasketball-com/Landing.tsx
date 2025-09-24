import { useEffect, useRef } from 'react'
import cssText from './styles.css?raw'
import { assetMap } from './assets-map'
import html from './compare/original.html?raw'

export default function Landing() {
  const containerRef = useRef(null as null | HTMLDivElement)
  const ORIG_BODY_CLASSES = "home wp-singular page-template page-template-template-home page-template-template-home-php page page-id-10244 wp-custom-logo wp-theme-legends tribe-js singular one-column right-sidebar sticky"

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Temporarily apply original body classes to better match theme CSS
const cls = (ORIG_BODY_CLASSES || '').split(/\s+/).filter(Boolean)
    cls.forEach(c => document.body.classList.add(c))

    // Note: avoid removing classes on unmount to prevent visible flash in React StrictMode dev
    const cleanupBody = () => { /* no-op to keep classes applied */ }
    const ABS = "https://www.legendsofbasketball.com"
    const isAbsUrl = (v: string | null) => !!v && /^(https?:|data:|blob:)/i.test(v)
    const looksLocal = (v: string | null) => !!v && (v.startsWith('/src/clones/') || v.startsWith('./assets/') || v.startsWith('/assets/') || v.includes('/src/clones/'))
    const absAgainst = (v: string, baseHref: string) => { try { return new URL(v, baseHref).toString() } catch { return v } }

    // Promote lazy-load attributes to eager so content is visible without site JS
    const promoteLazyAttributes = () => {
      // imgs
      container.querySelectorAll('img').forEach((img) => {
        const el = img as HTMLImageElement
        const ds = el.getAttribute('data-src') || el.getAttribute('data-lazy-src')
        if (!el.getAttribute('src') && ds) el.setAttribute('src', ds)
        const dss = el.getAttribute('data-srcset') || el.getAttribute('data-lazy-srcset')
        if (!el.getAttribute('srcset') && dss) el.setAttribute('srcset', dss)
      })
      // picture/source
      container.querySelectorAll('source').forEach((src) => {
        const el = src as HTMLSourceElement
        const dss = el.getAttribute('data-srcset') || el.getAttribute('data-lazy-srcset')
        if (!el.getAttribute('srcset') && dss) el.setAttribute('srcset', dss)
        const ds = el.getAttribute('data-src') || el.getAttribute('data-lazy-src')
        if (!el.getAttribute('src') && ds) el.setAttribute('src', ds)
      })
      // background images via data-bg / data-background / data-background-image
      container.querySelectorAll('[data-bg], [data-background], [data-background-image]').forEach((node) => {
        const el = node as HTMLElement
        const val = el.getAttribute('data-bg') || el.getAttribute('data-background') || el.getAttribute('data-background-image')
        if (val && !el.style.backgroundImage) {
const abs = absAgainst(val as any, ABS) as string
          const mapped = (assetMap as any)[abs] || abs
          el.style.backgroundImage = 'url(' + mapped + ')'
        }
      })
    }

    const rewriteAttr = (el: Element, attr: 'src'|'href'|'poster') => {
      const cur = el.getAttribute(attr)
      if (!cur) return
      // For mapping, try resolving against original site to match assetMap keys
      const key = isAbsUrl(cur) ? cur : absAgainst(cur, ABS)
      const mapped = (assetMap as any)[key]
      const anyEl = el as any
      if (mapped) {
        anyEl[attr] = mapped
        return
      }
      // Otherwise, preserve local paths and avoid mixing with original origin
      if (looksLocal(cur)) { anyEl[attr] = cur; return }
      if (!isAbsUrl(cur)) { anyEl[attr] = absAgainst(cur, location.href); return }
      anyEl[attr] = cur
    }

    const rewriteSrcSet = (el: Element) => {
      const cur = el.getAttribute('srcset')
      if (!cur) return
      const parts = cur.split(',').map(s => s.trim()).filter(Boolean)
      const remapped = parts.map(part => {
const [url, desc] = part.split(/\s+/, 2)
        const key = isAbsUrl(url) ? url : absAgainst(url, ABS)
        const mapped = (assetMap as any)[key]
        if (mapped) return desc ? (mapped + ' ' + desc) : mapped
        if (looksLocal(url)) return part
        if (!isAbsUrl(url)) {
          const locAbs = absAgainst(url, location.href)
          return desc ? (locAbs + ' ' + desc) : locAbs
        }
        return part
      }).join(', ')
      el.setAttribute('srcset', remapped)
    }

    promoteLazyAttributes()

    container.querySelectorAll('img').forEach((el) => { rewriteAttr(el, 'src'); rewriteSrcSet(el) })
    container.querySelectorAll('source').forEach((el) => { rewriteAttr(el, 'src'); rewriteSrcSet(el) })
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

    return () => { cleanupBody() }
  }, [])

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: cssText }} />
      {typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('__debug') && (
        <div style={{position:'fixed',bottom:0,left:0,right:0,maxHeight:200,overflow:'auto',background:'rgba(0,0,0,0.8)',color:'#fff',fontSize:12,padding:8,zIndex:99999}} id="__clone_debug_overlay">Debug overlay active. Check console for details.</div>
      )}
      <div ref={containerRef} dangerouslySetInnerHTML={{ __html: html }} />
    </>
  )
}
