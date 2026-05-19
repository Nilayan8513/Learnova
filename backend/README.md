<div align="center">

<br/>

# ⚡ Learnova Backend

### The AI engine behind smarter reading

<br/>

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini_Flash-4285F4?style=for-the-badge&logo=google&logoColor=white)
![Groq](https://img.shields.io/badge/Groq-F55036?style=for-the-badge&logo=groq&logoColor=white)
![Cerebras](https://img.shields.io/badge/Cerebras-6A0DAD?style=for-the-badge)

<br/>

> **Express.js REST API** · Multi-provider AI race strategy · In-memory caching · PDF extraction · arXiv + Semantic Scholar feed

<br/>

</div>

---

## 🧠 What It Does

Learnova's backend is the intelligence layer. It coordinates multiple AI providers, manages caching, extracts PDF text, and serves a research paper discovery feed — all from a single Express server.

It's designed around one core principle: **the fastest AI wins**. Instead of waiting for one provider to time out before trying the next, all providers race in parallel and the first response is used immediately.

---

## 🏗️ API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/generate` | `POST` | Analyze a research paper — returns concepts, visualizations, summary |
| `/api/detect-chapters` | `POST` | Extract a book's table of contents from the first 50 pages |
| `/api/analyze-chapter` | `POST` | Deep-analyze a book chapter in 30k-char batches |
| `/api/quiz-chapter` | `POST` | Generate 30 MCQ questions for a chapter |
| `/api/explain-simpler` | `POST` | Return a plain-English analogy for any concept |
| `/api/papers` | `GET` | Fetch recent papers from arXiv + Semantic Scholar (6h cache) |
| `/api/papers/search` | `GET` | Live paper search across both sources |
| `/api/fetch-pdf` | `GET` | Proxy a remote PDF and return extracted plain text |

---

## ⚡ Provider Strategy

### Book Analysis — Parallel Race

All three AI providers fire simultaneously. The first to respond wins. The other two are cancelled instantly via `AbortController`.

| Provider | Model | Strength |
|----------|-------|---------|
| 🥇 Cerebras | gpt-oss-120b | ~3000 tokens/sec — fastest inference available |
| 🥈 OpenRouter | auto | Free tier, broad model access |
| 🥉 Groq Books | llama-3.3-70b | 128k context, dedicated books API key |

If all three fail, a sequential Groq fallback kicks in automatically.

> **Result:** worst-case latency dropped from ~45 seconds (sequential) to ~7 seconds (parallel race).

---

### Research Papers — Sequential Fallback

Groq models tried in order, falling back on rate-limit or error.

| Priority | Model |
|----------|-------|
| 1 | Groq · llama-3.3-70b-versatile |
| 2 | Groq · llama-3.1-8b-instant |
| 3 | Groq · llama3-70b-8192 |

---

### Chapter Detection — Waterfall

| Priority | Provider |
|----------|---------|
| 1 | Cerebras |
| 2 | OpenRouter |
| 3 | Gemini 2.0 Flash |

---

### Quiz Generation — Primary + Fallback

| Priority | Provider |
|----------|---------|
| 1 | Gemini 2.0 Flash (1M context) |
| 2 | OpenRouter auto |

---

## 🛡️ Reliability Features

| Feature | How It Works |
|---------|-------------|
| **Chapter Cache** | Results stored in-memory, keyed by chapter title + offset + text fingerprint |
| **In-Flight Deduplication** | Concurrent identical requests share one `Promise` — no wasted API calls |
| **AbortSignal Propagation** | Losing race providers receive an abort signal and stop consuming tokens immediately |
| **Input Size Guard** | Requests over 500 000 characters are rejected with HTTP 413 before any AI call |
| **Timeout Wrapper** | Groq fallback calls are wrapped with a hard timeout to prevent indefinite hangs |
| **Papers Cache** | arXiv + Semantic Scholar feed cached for 6 hours — zero latency on repeat loads |
| **Stale-Cache Fallback** | If the papers fetch fails, the last cached response is served instead of an error |

---

## 📊 Visualization Pipeline

Every AI response goes through a three-stage validation pipeline before reaching the client.

**Stage 1 — AI Generation**
The prompt includes strict chart-type decision rules, variety requirements, and caption quality rules to steer the model toward meaningful, specific visualizations.

**Stage 2 — Variety Enforcement**
`enforceVizVariety()` ensures no two adjacent concepts share the same chart type. When a type needs rotating, only the `type` key changes — all AI-generated data labels are preserved.

**Stage 3 — Label Validation**
`hasGenericLabels()` scans every label array for generic placeholders (A, B, C, Category 1, etc.) and logs a warning. This feeds a monitoring signal without discarding data.

---

## 🔑 Environment Variables

| Variable | Purpose |
|----------|---------|
| `GROQ_API_KEY` | Groq — research paper routes |
| `GROQ_BOOKS_API_KEY` | Groq — book analysis (separate key, higher rate limits) |
| `CEREBRAS_API_KEY` | Cerebras gpt-oss-120b — fastest inference |
| `OPENROUTER_API_KEY` | OpenRouter auto — free-tier fallback |
| `GEMINI_API_KEY` | Google Gemini 2.0 Flash — quiz generation + TOC fallback |
| `PEXELS_API_KEY` | Pexels — cover images for paper cards |
| `PORT` | Server port · default `3001` |
| `NODE_ENV` | Set to `production` to enable `ALLOWED_ORIGIN` CORS |
| `ALLOWED_ORIGIN` | Allowed CORS origin in production |

---

## 🚀 Getting Started

**1.** Clone the repo and install dependencies

**2.** Copy `.env.example` to `.env` and fill in your API keys

**3.** Run `npm run dev` — server starts on `http://localhost:3001`

---

## 🧰 Tech Stack

| Layer | Choice |
|-------|--------|
| Runtime | Node.js |
| Framework | Express 5 |
| AI — Papers | Groq SDK |
| AI — Books | Cerebras · OpenRouter · Groq · Google Gemini |
| PDF Extraction | pdf-parse |
| Paper Discovery | arXiv XML API · Semantic Scholar Graph API |
| Images | Pexels API |
| Config | dotenv |
