#!/usr/bin/env node
import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import { writeFile } from 'fs/promises'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const args = process.argv.slice(2)
const urlArgIndex = args.findIndex(a => a.startsWith('http'))
const url = urlArgIndex >= 0 ? args[urlArgIndex] : null
const alsoLocal = args.includes('--also-local')
const blockAnalytics = true

if (!url) {
  console.error('Usage: node scripts/clone-site.mjs <url> [--also-local]')
  process.exit(1)
}

const slugFrom = (u) => new URL(u).hostname.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-')
const slug = slugFrom(url)

function runNode(script, scriptArgs = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...scriptArgs], { stdio: 'inherit' })
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${path.basename(script)} exited with code ${code}`))
    })
  })
}

async function main() {
  const t0 = Date.now()
  await runNode(path.join(__dirname, 'clone.mjs'), [url])
  const cloneMs = Date.now() - t0

  // Run compare separately (do not count toward clone time)
  const compareArgs = [url]
  if (blockAnalytics) compareArgs.push('--block-analytics')
  if (alsoLocal) compareArgs.push('--also-local')
  try {
    await runNode(path.join(__dirname, 'clone-compare.mjs'), compareArgs)
  } catch (err) {
    console.error('Compare failed:', err?.message || err)
  }

  // Persist timings
  const projectRoot = path.resolve(__dirname, '..')
  const outPath = path.join(projectRoot, 'src', 'clones', slug, 'clone-run.json')
  const record = {
    url,
    slug,
    when: new Date().toISOString(),
    cloneMs,
    cloneSeconds: Math.round(cloneMs / 100) / 10,
    compared: true,
    alsoLocal,
    blockAnalytics
  }
  await writeFile(outPath, JSON.stringify(record, null, 2), 'utf-8')
  console.log(`Clone complete in ${record.cloneSeconds}s (comparison ran separately). Summary -> ${path.relative(process.cwd(), outPath)}`)
}

main().catch((e) => { console.error(e); process.exit(1) })