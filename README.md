# 🧬 Cloner

A new peer project created with the `newpeer` command! This is a full-stack application with Python FastAPI backend and React TypeScript frontend.

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- npm/yarn

### Development Setup

1. **Backend Setup**:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

2. **Frontend Setup**:
```bash
cd frontend
npm install
npm run dev
```

3. **Access the application**:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## 🏗️ Project Structure

```
Cloner/
├── 📁 backend/          # Python FastAPI backend
│   ├── api/routes/      # API endpoints
│   ├── core/           # Configuration & database
│   ├── models/         # Database models
│   ├── utils/          # Utility functions
│   └── main.py         # FastAPI application
│
├── 📁 frontend/         # React TypeScript frontend  
│   ├── src/            # React components & logic
│   ├── index.html      # HTML template
│   └── vite.config.ts  # Vite configuration
│
├── 📁 docs/            # Documentation
├── 📁 .claude/         # Claude Code configuration
├── 🚀 render.yaml      # Backend deployment config
├── 🌐 netlify.toml     # Frontend deployment config
└── 📖 README.md        # This file
```

## 🎨 Features

- ✅ **FastAPI Backend** with automatic docs & CORS
- ✅ **React + TypeScript** with Vite for fast development  
- ✅ **SQLAlchemy ORM** with SQLite (development) / PostgreSQL ready
- ✅ **Deployment Ready** for Render (backend) & Netlify (frontend)
- ✅ **MCP Integration** with Playwright, Desktop Automation, Plasmo
- ✅ **Custom Green Theme** with unique color scheme
- ✅ **Claude Code Ready** with project-specific configuration

## 🚀 Deployment

### Backend to Render
1. Connect your GitHub repo to Render
2. Render will detect `render.yaml` automatically
3. Set environment variables as needed
4. Deploy!

### Frontend to Netlify  
1. Connect your GitHub repo to Netlify
2. Netlify will detect `netlify.toml` automatically
3. Set `VITE_API_BASE_URL` to your Render backend URL
4. Deploy!

## 🛠️ MCP Servers Configured

This project includes the following MCP servers:
- **Playwright**: Browser automation and testing
- **Desktop Automation**: Desktop interaction capabilities  
- **Plasmo MCP Server**: Extension development tools

## 🎯 Development Commands

```bash
# Backend
cd backend && python main.py              # Start backend
cd backend && python -m pytest            # Run tests (when added)

# Frontend  
cd frontend && npm run dev                 # Start dev server
cd frontend && npm run build               # Build for production
cd frontend && npm run lint                # Lint code

# Both
npm run dev     # Start both frontend and backend (if root package.json added)
```

## 🔧 Environment Variables

### Backend (.env in backend/)
```env
ENVIRONMENT=development
DEBUG=true
SECRET_KEY=your-secret-key
DATABASE_URL=sqlite:///./cloner.db
```

### Frontend (.env in frontend/)  
```env
VITE_API_BASE_URL=http://localhost:8000
```

## 📞 Support

This project was generated using the `newpeer` command for Claude Code. For issues:

1. Check the logs in backend/frontend consoles
2. Verify API connectivity via `/api/health` endpoint
3. Ensure all dependencies are installed
4. Check CORS configuration if frontend can't reach backend

---

**Created with** ⚡ Vite + React + TypeScript + FastAPI + Claude Code

Happy coding! 🚀