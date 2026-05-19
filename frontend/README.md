<div align="center">

<br/>

# 📚 Learnova Frontend

### Turn any book or paper into an interactive learning experience

<br/>

![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Recharts](https://img.shields.io/badge/Recharts-22B5BF?style=for-the-badge)
![Mermaid](https://img.shields.io/badge/Mermaid.js-FF3670?style=for-the-badge)

<br/>

> **Next.js 16 App Router** · AI-powered analysis · Interactive quiz engine · Research paper discovery · Dynamic data visualizations

<br/>

</div>

---

## ✨ What It Does

Learnova is a single-page application that lets you upload any PDF book, pick a chapter, and either **deeply understand it** through AI-generated explanations and charts, or **test yourself** with a 30-question adaptive quiz.

It also features a live **research paper discovery feed** pulling from arXiv and Semantic Scholar, where any paper can be analyzed on the spot.

---

## 🗺️ Views & Navigation

The app uses a state-machine view router with full browser Back-button support via `history.pushState`.

| View | What You See |
|------|-------------|
| 🏠 **Home** | Research paper discovery feed with category filters and live search |
| 📤 **Upload** | Drag-and-drop PDF upload · URL input · Chapter detection in progress |
| 📑 **Chapters** | Detected chapter list · Mode picker (Analyze or Quiz) |
| 🔍 **Analyze** | AI breakdown — summary, sections, charts, concepts, key insights |
| 🧪 **Quiz** | 30 MCQ questions with live feedback, progress bar, and score card |
| 📄 **Paper Result** | Research paper concept cards with visualizations |

---

## 🧩 Components

### 🗞️ Research Feed
Pulls fresh papers from arXiv (cs.AI / LG / CV / CL) and Semantic Scholar. Supports keyword search and category filtering. Clicking any paper with a PDF link sends it straight to the analysis pipeline.

### 📤 Upload Section
Handles drag-and-drop and file-picker PDF uploads. Reads the file in the browser using `pdfjs-dist`, sends the first 50 pages to the backend for chapter detection, and gracefully handles corrupted or unreadable files.

### 📑 Chapter Selection
Displays all detected chapters in a clean list. The user picks one or more chapters and chooses a mode — **Analyze** for deep understanding or **Quiz** for self-testing.

### 📖 Analyze View
The richest view in the app. Each chapter section renders with:
- A plain-English explanation with real-world analogies
- A data visualization matched to the section's content type
- A key insight callout
- A **Load More Topics** button for paginated continuation of long chapters

At the bottom, key concepts are listed — clicking any opens an AI-powered "explain simpler" panel fetched live from the backend.

### 🧪 Quiz View
Thirty multiple-choice questions covering the full chapter. Each question shows:
- Color-coded answer feedback (green for correct, red for wrong)
- A brief explanation after answering
- A progress bar tracking completion

The final screen shows score, percentage, and a motivational message.

---

## 📊 Visualization Engine

Learnova renders **six chart types** across two chart systems.

### Full Charts — Research Papers

Used in paper analysis concept cards. Rendered by `ConceptCharts.tsx`.

| Chart Type | Best For |
|------------|---------|
| 📈 Line | Trends over time or training steps |
| 📊 Bar | Comparing named groups on one metric |
| 🔵 Scatter | Correlations between two continuous variables |
| 🕸️ Radar | One subject scored across 5+ attributes |
| 📋 Table | When exact numbers matter more than shape |
| 🔀 Flow | Processes, pipelines, and sequences |

### Compact Charts — Book Sections

Smaller, inline charts rendered inside `BookResults.tsx` for each chapter section.

| Chart Type | Best For |
|------------|---------|
| 📊 Bar | Category comparisons with value labels |
| 📈 Line | Progression or trends with a named series |
| 🥧 Pie | Part-to-whole with a clean legend |
| 🔀 Flow | Step-by-step processes (max 4 steps per row, centred) |
| ⊞ Comparison Table | Feature-by-feature side-by-side comparison |
| ◎ Timeline | Chronological events on a dot-line layout |

> **No text overlap.** All axis labels use Recharts' built-in `label` prop — no manual DOM overlays. Legends are pinned to the top so they never collide with x-axis ticks. Flow diagrams wrap into rows of four and are always centred.

---

## 🎨 Design System

Built on CSS custom properties — no utility frameworks.

| Token | Value | Role |
|-------|-------|------|
| `--bg` | `#F8F7F4` | Warm off-white page background |
| `--bg-card` | `#FFFFFF` | Card surfaces |
| `--bg-muted` | `#F3F2EE` | Inputs, callouts, subtle fills |
| `--text-primary` | `#111111` | Headings and strong text |
| `--text-secondary` | `#555550` | Body paragraphs |
| `--text-muted` | `#9B9B95` | Labels, captions, metadata |
| `--border` | `#E0E0DC` | All borders and dividers |
| `--accent` | `#1A1A19` | Primary action buttons |
| `--red` | `#C04A22` | Error states and Advanced difficulty |

**Typefaces:** `Instrument Serif` for headings · `Inter` for all body and UI text.

**Chart palette:** Academic muted blue `#4A6FA5` as the primary series color, with coral, teal, sage, and warm brown as secondary series. No vivid or neon colors anywhere.

---

## 🔑 Environment Variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | Backend base URL · defaults to `http://localhost:3001` |

---

## 🚀 Getting Started

**1.** Clone and install dependencies

**2.** Create `.env.local` and set `NEXT_PUBLIC_API_URL` to your backend URL

**3.** Run `npm run dev` — app starts on `http://localhost:3000`

The [Learnova Backend](https://github.com/Nilayan8513/Learnova_backend) must be running for any AI features to work.

---

## 🧰 Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 · App Router · Turbopack |
| Language | TypeScript |
| Charts | Recharts 2 |
| Flow Diagrams | Mermaid.js (dynamic import, no SSR) |
| PDF Parsing | pdfjs-dist (browser worker) |
| Styling | Vanilla CSS · CSS custom properties |
| Fonts | Google Fonts · Instrument Serif + Inter |
