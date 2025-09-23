import { Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home'
import ComponentsChecklist from './pages/ComponentsChecklist'
import { cloneRoutes } from './clones/routes'
import './App.css'

function App() {
  return (
    <div className="App">
      <header className="App-header" style={{ paddingBottom: 0 }}>
        <h1>🧬 Cloner</h1>
        <nav style={{ marginTop: 8 }}>
          <Link to="/" style={{ marginRight: 12 }}>Home</Link>
          <Link to="/__components__">Components Checklist</Link>
        </nav>
      </header>
      <main style={{ padding: 24 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/__components__" element={<ComponentsChecklist />} />
          {cloneRoutes.map(({ path, Component }) => (
            <Route key={path} path={path} element={<Component />} />
          ))}
        </Routes>
      </main>
    </div>
  )
}

export default App
