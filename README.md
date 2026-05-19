# Learnova Monorepo

AI-powered research paper discovery and book analysis platform.

## Structure

```
Learnova/
├── frontend/   → Next.js 16 app (port 3000)
└── backend/    → Express.js API (port 3001)
```

## Quick Start

```bash
# Install all dependencies
npm run install:all

# Run both frontend + backend simultaneously
npm run dev
```

Or run separately:
```bash
npm run dev:frontend
npm run dev:backend
```

## Environment Variables

**backend/.env**
```
GROQ_API_KEY=...
GROQ_BOOKS_API_KEY=...
OPENROUTER_API_KEY=...
GEMINI_API_KEY=...
CEREBRAS_API_KEY=...
CORE_API_KEY=...
PORT=3001
```

**frontend/.env.local**
```
NEXT_PUBLIC_API_BASE=http://localhost:3001
```
