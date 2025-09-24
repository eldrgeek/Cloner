import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { manifest } from '../clones/manifest'

interface SelectablePage {
  path: string
  selected: boolean
}

export default function ComponentsChecklist() {
  const [items, setItems] = useState<SelectablePage[]>(
    () => manifest.pages.map(p => ({ path: p.path, selected: false }))
  )

  const landingChecked = useMemo(
    () => manifest.pages.find(p => p.path === manifest.landingPath)?.cloned ?? false,
    []
  )

  const toggle = (path: string) => {
    setItems(prev => prev.map(i => i.path === path ? { ...i, selected: !i.selected } : i))
  }

  const handleClone = () => {
    const selected = items.filter(i => i.selected).map(i => i.path)
    if (selected.length === 0) {
      alert('Select at least one page to clone.')
      return
    }
    const commands = selected.map(p => `npm run clone -- ${new URL(p, manifest.baseUrl).toString()}`)
    navigator.clipboard?.writeText(commands.join('\n')).catch(() => {})
    alert(`Prepared ${selected.length} clone command(s).\n\nThey were copied to your clipboard. Paste into Warp to run.\n\n` + commands.join('\n'))
  }

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Link to="/">← Back to Home</Link>
      </div>
      <h2>Discovered Pages</h2>
      <p>Base URL: <code>{manifest.baseUrl}</code></p>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {manifest.pages.map(p => (
          <li key={p.path} style={{ marginBottom: 8 }}>
            <label>
              <input
                type="checkbox"
                disabled={p.cloned}
                checked={items.find(i => i.path === p.path)?.selected || false}
                onChange={() => toggle(p.path)}
              />
              <span style={{ marginLeft: 8 }}>
                {p.path} {p.cloned && '✅'}
              </span>
            </label>
          </li>
        ))}
      </ul>
      <div style={{ marginTop: 16 }}>
        <button onClick={handleClone}>Clone</button>
      </div>
      <div style={{ marginTop: 16, fontSize: 12, opacity: 0.8 }}>
        <p>Landing page: {manifest.landingPath} {landingChecked && '✅'}</p>
        <p>Note: The Clone button prepares commands you can run in Warp. Full automation can be wired later.</p>
      </div>
    </div>
  )
}