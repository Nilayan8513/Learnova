<div align="center">

<br/>

# 📚 Learnova

### Turn any book or research paper into an interactive learning experience

<br/>

![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini_Flash-4285F4?style=for-the-badge&logo=google&logoColor=white)
![Groq](https://img.shields.io/badge/Groq-F55036?style=for-the-badge&logo=groq&logoColor=white)
![Cerebras](https://img.shields.io/badge/Cerebras-6A0DAD?style=for-the-badge)

<br/>

> **Monorepo** · Next.js 16 frontend · Express.js backend · Multi-provider AI race · arXiv research feed · PDF analysis · Interactive quiz engine

<br/>

</div>

---

## 🗂️ Structure

```
Learnova/
├── frontend/          → Next.js 16 app              (port 3000)
├── backend/           → Express.js REST API          (port 3001)
├── package.json       → root workspaces + scripts
└── .gitignore
```

---

## 🚀 Quick Start

```bash
# 1. Clone
git clone https://github.com/Nilayan8513/Learnova.git
cd Learnova

# 2. Install all dependencies
npm install
npm install --workspace=frontend
npm install --workspace=backend

# 3. Add environment files (see below)

# 4. Run both frontend + backend simultaneously
npm run dev
```

Or run separately:
```bash
npm run dev:frontend   # → http://localhost:3000
npm run dev:backend    # → http://localhost:3001
```

---

## 🔑 Environment Variables

**`backend/.env`**
```
GROQ_API_KEY=...
GROQ_BOOKS_API_KEY=...
OPENROUTER_API_KEY=...
GEMINI_API_KEY=...
CEREBRAS_API_KEY=...
CORE_API_KEY=...
PORT=3001
```

**`frontend/.env.local`**
```
NEXT_PUBLIC_API_BASE=http://localhost:3001
```

---

## ✨ What It Does

Learnova has two core experiences:

**📖 Book Analysis** — Upload any PDF, pick a chapter, choose between deep **Analyze** mode (AI explanations + charts) or **Quiz** mode (30 MCQ questions with instant feedback).

**🗞️ Research Feed** — A live discovery feed pulling from **arXiv** across 9 academic categories (AI, CS, Math, Biology, Physics, Economics, Machine Learning, Medicine, Climate). Click any paper to analyze it directly.

---

## 🗺️ Views & Navigation

| View | What You See |
|------|-------------|
| 🏠 **Home** | Research paper feed with category filters, live search, load-more pagination |
| 📤 **Upload** | Drag-and-drop PDF upload · URL input · Chapter detection |
| 📑 **Chapters** | Detected chapter list · Mode picker (Analyze or Quiz) |
| 🔍 **Analyze** | AI breakdown — summary, sections, charts, concepts, key insights |
| 🧪 **Quiz** | 30 MCQ questions with feedback, progress bar, and score card |
| 📄 **Paper Result** | Research paper concept cards with visualizations |

---

## ⚡ Backend — AI Provider Strategy

### Book Analysis — Parallel Race
All three providers fire simultaneously. First to respond wins.

| Provider | Model | Strength |
|----------|-------|---------|
| 🥇 Cerebras | gpt-oss-120b | ~3000 tokens/sec — fastest available |
| 🥈 OpenRouter | auto | Free tier, broad model access |
| 🥉 Groq Books | llama-3.3-70b | 128k context, dedicated key |

> **Result:** worst-case latency dropped from ~45s (sequential) to ~7s (parallel race).

### Chapter Detection — Waterfall
Cerebras → OpenRouter → Gemini 2.0 Flash

### Quiz Generation — Primary + Fallback
Gemini 2.0 Flash (1M context) → OpenRouter auto

---

## 🛠️ API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/generate` | `POST` | Analyze a research paper — concepts, visualizations, summary |
| `/api/detect-chapters` | `POST` | Extract book table of contents from first 50 pages |
| `/api/analyze-chapter` | `POST` | Deep-analyze a chapter in 30k-char batches |
| `/api/quiz-chapter` | `POST` | Generate 30 MCQ questions for a chapter |
| `/api/explain-simpler` | `POST` | Plain-English analogy for any concept |
| `/api/papers` | `GET` | arXiv feed across 9 categories (6h cache) |
| `/api/papers/search` | `GET` | Live arXiv full-text search |
| `/api/fetch-pdf` | `GET` | Proxy a remote PDF and return extracted text |

---

## 📊 Visualization Engine

### Research Paper Charts (`ConceptCharts.tsx`)
| Type | Best For |
|------|---------|
| 📈 Line | Trends over time or training steps |
| 📊 Bar | Comparing named groups |
| 🔵 Scatter | Correlations between two variables |
| 🕸️ Radar | One subject across 5+ attributes |
| 📋 Table | Exact numbers over visual shape |
| 🔀 Flow | Processes, pipelines, sequences |

### Book Section Charts (`BookResults.tsx`)
| Type | Best For |
|------|---------|
| 📊 Bar | Category comparisons |
| 📈 Line | Progression or trends |
| 🥧 Pie | Part-to-whole breakdown |
| 🔀 Flow | Step-by-step processes |
| ⊞ Comparison | Feature-by-feature side-by-side |
| ◎ Timeline | Chronological events |

---

## 🎨 Design System

Built on CSS custom properties — no utility frameworks.

| Token | Value | Role |
|-------|-------|------|
| `--bg` | `#F8F7F4` | Warm off-white background |
| `--bg-card` | `#FFFFFF` | Card surfaces |
| `--text-primary` | `#111111` | Headings |
| `--text-secondary` | `#555550` | Body text |
| `--border` | `#E0E0DC` | Borders and dividers |
| `--accent` | `#1A1A19` | Primary buttons |

**Typefaces:** `Instrument Serif` for headings · `Inter` for UI text

---

## 🧰 Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend Framework | Next.js 16 · App Router · Turbopack |
| Language | TypeScript |
| Backend | Node.js · Express 5 |
| AI — Books | Cerebras · OpenRouter · Groq · Google Gemini |
| AI — Papers | Groq SDK |
| Charts | Recharts 2 |
| Flow Diagrams | Mermaid.js |
| PDF (browser) | pdfjs-dist |
| PDF (server) | pdf-parse |
| Paper Discovery | arXiv XML API (9 categories, parallel fetch) |
| Styling | Vanilla CSS · CSS custom properties |
| Fonts | Google Fonts · Instrument Serif + Inter |
| Monorepo | npm workspaces + concurrently |
