import { useState, useEffect } from 'react'
import '../App.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

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