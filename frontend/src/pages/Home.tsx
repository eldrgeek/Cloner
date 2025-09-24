import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import '../App.css'
import registry from '../clones/registry.json'

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';

interface HealthStatus {
  status: string;
  service: string;
  timestamp: string;
  version: string;
}

export default function Home() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/health`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        setHealth(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    checkHealth();
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>🧬 Cloner</h1>
        <p>A new peer project created with the newpeer command!</p>
        
        <div className="status-card">
          <h2>Backend Status</h2>
          {loading && <p>Checking backend connection...</p>}
          {error && (
            <div className="error">
              <p>❌ Backend connection failed</p>
              <p>{error}</p>
              <p>Make sure the backend is running on {API_BASE_URL}</p>
            </div>
          )}
          {health && (
            <div className="success">
              <p>✅ Backend connected successfully!</p>
              <p>Service: {health.service}</p>
              <p>Status: {health.status}</p>
              <p>Version: {health.version}</p>
            </div>
          )}
        </div>

        <div className="features">
          <h2>Cloned Sites</h2>
          {Array.isArray(registry) && registry.length > 0 ? (
            <ul>
              {registry.map((entry: any) => (
                <li key={entry.slug}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Link to={`/${entry.slug}`}>{entry.title || entry.slug}</Link>
                    <span style={{ marginLeft: 4, opacity: 0.7 }}>({entry.baseUrl})</span>
                    <span style={{ marginLeft: 8, opacity: 0.6 }}>|</span>
                    <a href={entry.baseUrl} target="_blank" rel="noreferrer">Open original</a>
                    <span style={{ opacity: 0.6 }}>/</span>
                    <Link to={`/${entry.slug}`}>Open clone</Link>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p>No clones yet. Use the Components Checklist or run <code>npm run clone:site -- https://example.com</code>.</p>
          )}
        </div>

        <div className="features">
          <h2>Configured Features</h2>
          <ul>
            <li>✅ FastAPI Backend with CORS</li>
            <li>✅ React + TypeScript + Vite Frontend</li>
            <li>✅ SQLite Database with SQLAlchemy</li>
            <li>✅ Render & Netlify Deployment Ready</li>
            <li>✅ MCP Servers: Playwright, Desktop Automation, Plasmo</li>
            <li>✅ Custom Green Color Scheme</li>
          </ul>
        </div>
      </header>
    </div>
  )
}