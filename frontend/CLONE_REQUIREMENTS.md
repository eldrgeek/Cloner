# Cloner: Site Cloning and Theming – Requirements (Draft)

Status: Draft (rev 2)
Owner: Warp Agent Mode
Scope: Frontend repo (/frontend)

Next step: Agent to harmonize changes, propose refinements, and seek approval for implementation.

## Summary

Two Warp slash-commands to support intelligent website cloning:
- /clone-site: Agent-led cloning of a website’s landing page (and optionally additional pages), generating React + TypeScript routes, CSS, and a checklist UI to clone more pages.
- /clone-theme: Theme extraction (colors, fonts, variables) from a site; applies or stages a theme to the local app.

Key difference: /clone-site is multi-step and agent-driven using Playwright via MCP so the agent remains “in the loop.” /clone-theme builds on the analysis, focusing on CSS variables and fonts, not full page cloning.

## Goals

- Produce a visually faithful (pixel-accurate when feasible) landing page clone from the server DOM and CSS.
- Discover internal routes (same-origin anchors / router links) and generate React stubs for them.
- Provide a hidden checklist route (e.g. /__components__) listing discovered pages, with the landing page marked as cloned.
- Preserve/approximate key interactions (links, buttons, forms) with SPA-friendly stubs.
- Allow the agent to repeat cloning for selected pages, making intelligent choices (naming, grouping, de-duplication).
- Optionally extract a theme (colors/fonts) as CSS variables.

## Non‑Goals (initial)

- Full semantic refactor into clean, hand-authored components (future phase).
- Perfect 1:1 functionality for complex JS apps (auth, payments, dynamic state). Focus is static fidelity + navigation stubs.
- Legal risk mitigation.

## User Flows

### /clone-site (primary)
1) Prompt for URL (Warp parameter or prompt).
2) Agent launches Playwright via MCP and navigates to the URL.
3) Agent collects landing page data:
   - DOM snapshot (HTML body)
   - Linked CSS hrefs and inline <style>
   - Base URL
   - Internal anchors and same-origin routes
   - Interaction candidates (anchors, buttons with click handlers, forms)
   - Text/image components and structural containers
   - Objective: a high-fidelity (ideally pixel-accurate) clone of the landing page
4) Agent generates artifacts under src/clones/<slug>/:
   - assets/: same-origin images and media downloaded locally; cross-origin assets remain as remote URLs
   - Landing.tsx: dangerouslySetInnerHTML of captured HTML + asset URL rewrite + SPA link interception
   - styles.css: concatenation of linked and inline styles
   - Optional subfolders under assets/ by type if helpful (img/, fonts/, media/)
   - One stub component per discovered same-origin route
5) Agent updates:
   - src/clones/routes.ts: registers /<slug> and newly stubbed routes
   - src/clones/manifest.ts: baseUrl, landingPath, pages array with cloned flags
6) Checklist route (/__components__):
   - Lists discovered pages with the landing page marked ✅
   - Buttons: "Clone", "Optimize", "Done"
   - Clone: agent iterates selected pages, navigates via MCP, repeats capture, and updates artifacts/routes/manifest
   - Optimize: agent proposes CSS/site-structure optimizations and refactors common components; user approves changes before applying

During Clone or Optimize the agent can also:
- Extract theme signals:
  - Color palette candidates (from stylesheets and computed styles)
  - Font families (linked and defined in CSS)
  - High-level tokens (primary, secondary, background, text) via heuristics
- Produce a theme file:
  - src/theme/site-<slug>.css (CSS variables + @import fonts if applicable)
  - Optionally stage a toggle to enable the theme

## Artifacts (file layout)

- src/clones/<slug>/
  - Landing.tsx
  - styles.css
  - assets/ (downloaded same-origin assets)
  - pages/
    - <route>.tsx (for each discovered route; e.g., pages/blog.tsx)
- src/clones/routes.ts (AUTO-GENERATED; list of { path, Component })
- src/clones/manifest.ts (AUTO-GENERATED; baseUrl, landingPath, pages)
- src/pages/ComponentsChecklist.tsx (hidden route UI: /__components__)
- src/pages/Home.tsx (existing home page)

## Agent vs. Script Responsibilities

- Agent (Warp):
  - Orchestrates navigation and decisions via Playwright MCP (browser_navigate, browser_evaluate, browser_snapshot, etc.).
  - Interprets DOM, identifies component boundaries, names stubs, groups routes, dedupes pages.
  - Applies idempotent updates to generated files; asks for approval on impactful refactors.
- Helper scripts (optional):
  - Deterministic, idempotent tasks (CSS concatenation, asset downloads, URL normalization).
  - No destructive edits to user-authored code.

## Technical Design

- Playwright MCP:
  - Navigate: browser_navigate
  - Snapshot: browser_snapshot; browser_evaluate to capture HTML, link hrefs, inline styles
  - Discovery: browser_evaluate over a[href], resolve against location.href, filter to same-origin, normalize to pathname, dedupe
  - Interactions: detect anchors/buttons (role="button"), onclick handlers, ARIA roles; enumerate forms/actions

- React scaffolding:
  - Landing.tsx uses dangerouslySetInnerHTML and imports styles.css
  - useEffect: rewrite asset URLs to local assets/ (for same-origin) and keep remote references for cross-origin; intercept internal link clicks (pushState + popstate)
  - Stubs: minimal components for discovered routes
  - Routing: cloneRoutes imported into App.tsx and mapped to <Route>

- Theming (/clone-theme):
  - Extract colors via CSS parsing and computed style sampling
  - Derive palette (primary/secondary/background/surface/text)
  - Write CSS variables to site-<slug>.css; add @import for fonts; optional theme toggle

- Idempotency & Safety:
  - All generated under src/clones/
  - Re-running on same <slug> updates Landing.tsx, styles.css, routes.ts, manifest.ts
  - Avoid destructive edits to user-authored files
  - Consider blocking analytics/tracking during capture

## Operational Flow (Agent‑led)

1) User runs /clone-site URL
2) Agent:
   - Navigates, collects data, proposes plan (slug, stubs)
   - Confirms write targets (src/clones/<slug>/)
   - Writes files, updates routes/manifest
   - Opens /__components__ to select additional pages
3) Agent repeats for selected pages

## Edge Cases & Considerations

- SPAs without server anchors: instrument router or simulate clicks to enumerate routes
- Auth-gated content: out-of-scope initially; consider storage state later
- CSP/CORS: best-effort capture; warn on failures
- Animation/heavy JS: static snapshot preferred; document limitations
- Duplicate/parameterized routes: treat as individual stubs initially

## Decisions

- Slugging: A (hostname-only). Example: example.com → slug "example-com".
- Stub file layout: initial stubs live under src/clones/<slug>/pages/.
  - Example: /blog → src/clones/example-com/pages/blog.tsx
  - The agent may later optimize/refactor to nested folders, e.g., /blog → src/clones/example-com/pages/blog/blog.tsx.

## Anwered Questions

1) Checklist route name: /__components__
2) Theme scope: apply globally
3) Blocklist analytics domains during capture? (Don't understand')
4) Crawl depth for initial batch landing-only

## Acceptance Criteria (Initial)

- /clone-site:
  - /<slug> renders a faithful landing page with styles
  - /__components__ lists discovered pages; landing ✅
  - Selected pages can be cloned; stubs and routes added
- /clone-theme: ***Not in scope


## Next Steps

- Review my changes and integrate. Ask any new questions
- Implement the agent-led flow with MCP, using helpers for deterministic tasks
- Decide slugging strategy and checklist route name (Done)
