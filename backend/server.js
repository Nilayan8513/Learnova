require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const pdfParse = require('pdf-parse');

const app = express();
const PORT = process.env.PORT || 3001;
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? (process.env.ALLOWED_ORIGIN || '*')
    : 'http://localhost:3000',
}));
app.use(express.json({ limit: '50mb' }));

const groq  = new Groq({ apiKey: process.env.GROQ_API_KEY });        // papers
const groq2 = new Groq({ apiKey: process.env.GROQ_BOOKS_API_KEY });  // books only
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ─── Provider queues (papers only) ────────────────────────────────────────────
const PAPER_PROVIDERS = [
  { name: 'Groq › llama-3.3-70b-versatile', type: 'groq', model: 'llama-3.3-70b-versatile', maxChars: 3000 },
  { name: 'Groq › llama-3.1-8b-instant',    type: 'groq', model: 'llama-3.1-8b-instant',    maxChars: 3000 },
  { name: 'Groq › llama3-70b-8192',         type: 'groq', model: 'llama3-70b-8192',          maxChars: 3000 },
];

// ─── Pexels ────────────────────────────────────────────────────────────────────
function pexelsTopic(title = '') {
  const t = title.toLowerCase();
  // AI & ML
  if (/\b(attention mechanism|transformer|bert|gpt|llm|large language)\b/.test(t)) return 'neural network deep learning visualization';
  if (/\b(reinforcement learning|reward|policy|agent|game|atari)\b/.test(t)) return 'artificial intelligence robotics automation';
  if (/\b(machine learning|supervised|classification|regression|feature)\b/.test(t)) return 'data science machine learning analytics';
  if (/\b(neural network|deep learning|convolutional|cnn|rnn|lstm)\b/.test(t)) return 'artificial intelligence neural computing';
  if (/\b(ai|artificial intelligence|nlp|language model)\b/.test(t)) return 'technology futuristic artificial intelligence';
  // Biology & Medicine
  if (/\b(genome|dna|gene|sequencing|mutation|crispr)\b/.test(t)) return 'dna genetics laboratory science';
  if (/\b(cancer|tumor|oncology|chemotherapy|immunotherapy)\b/.test(t)) return 'medical research cancer laboratory';
  if (/\b(protein|enzyme|cell biology|molecular|biochem)\b/.test(t)) return 'molecular biology cell science';
  if (/\b(drug|pharmaceutical|clinical trial|medicine|treatment|therapy)\b/.test(t)) return 'medicine healthcare pharmaceutical research';
  if (/\b(neuro|brain|cognitive|neuroscience|synapse)\b/.test(t)) return 'brain neuroscience human mind';
  // Economics & Finance
  if (/\b(stock|market|trading|investment|portfolio|asset)\b/.test(t)) return 'stock market finance trading';
  if (/\b(labor|employ|wage|work|job|unemployment)\b/.test(t)) return 'workplace employment labor economics';
  if (/\b(gdp|growth|macroeconomics|monetary|fiscal|inflation)\b/.test(t)) return 'economy business growth charts';
  if (/\b(econom|finance|trade|income|poverty|inequality)\b/.test(t)) return 'business finance economics money';
  // Physics & Engineering
  if (/\b(quantum|qubit|superposition|entanglement)\b/.test(t)) return 'quantum physics abstract technology';
  if (/\b(optics|laser|photon|light|wavelength|spectrum)\b/.test(t)) return 'laser light optics science';
  if (/\b(robot|mechanical|engineering|sensor|actuator)\b/.test(t)) return 'robotics engineering technology';
  if (/\b(physics|particle|nuclear|atom|energy|relativity)\b/.test(t)) return 'physics science laboratory experiment';
  // Climate & Environment
  if (/\b(solar|wind|renewable|energy transition|carbon neutral)\b/.test(t)) return 'solar wind renewable energy nature';
  if (/\b(climate change|global warming|temperature|emission|co2)\b/.test(t)) return 'climate change environment earth';
  if (/\b(ecology|biodiversity|species|ecosystem|deforestation)\b/.test(t)) return 'nature ecology biodiversity forest';
  // Social Science & Psychology
  if (/\b(social media|misinformation|fake news|polarization|online)\b/.test(t)) return 'social media technology communication';
  if (/\b(survey|poll|population|demography|census|ethnicity)\b/.test(t)) return 'people society community diversity';
  if (/\b(psych|cognit|mental health|behavior|emotion|anxiety)\b/.test(t)) return 'psychology human mind mental health';
  // Computer Vision
  if (/\b(image recognition|object detection|segmentation|diffusion|generative image)\b/.test(t)) return 'computer vision image recognition technology';
  if (/\b(video|surveillance|tracking|pose estimation)\b/.test(t)) return 'camera video technology surveillance';
  // Cybersecurity
  if (/\b(security|privacy|encryption|attack|malware|vulnerability|cyber)\b/.test(t)) return 'cybersecurity technology hacker data protection';
  // Default with title-based search
  const firstWords = title.split(' ').slice(0, 3).join(' ');
  if (firstWords.length > 4) return `${firstWords} research abstract`;
  return 'science research knowledge abstract';
}

async function fetchPexelsImage(title) {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;
  const query = encodeURIComponent(pexelsTopic(title));
  // Use a random page (1-8) so repeated calls for similar topics get different images
  const page = Math.floor(Math.random() * 8) + 1;
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${query}&per_page=15&page=${page}&orientation=landscape`,
      { headers: { Authorization: key } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.photos?.length) return null;
    // Pick a random photo from the results
    const idx = Math.floor(Math.random() * data.photos.length);
    return data.photos[idx]?.src?.large2x || data.photos[idx]?.src?.large || null;
  } catch { return null; }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function trimText(text, maxChars = 12000) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxChars) return clean;
  const third = Math.floor(maxChars / 3);
  const mid = Math.floor(clean.length / 2);
  const midHalf = Math.floor(third / 2);
  return (
    clean.slice(0, third) +
    '\n\n[...]\n\n' +
    clean.slice(mid - midHalf, mid + midHalf) +
    '\n\n[...]\n\n' +
    clean.slice(clean.length - third)
  );
}

function extractJSON(raw) {
  let text = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  const start = text.indexOf('{');
  const startArr = text.indexOf('[');
  // Handle both object and array root
  if (startArr !== -1 && (start === -1 || startArr < start)) {
    const end = text.lastIndexOf(']');
    if (end === -1 || end <= startArr) throw new Error('No JSON array found.');
    return JSON.parse(text.slice(startArr, end + 1));
  }
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) throw new Error('No JSON found.');
  return JSON.parse(text.slice(start, end + 1));
}

// ─── Generic label detector ──────────────────────────────────────────────────
const GENERIC_LABEL_RE = /^(a|b|c|d|category \d+|method [ab]|value|item \d+|series \d+|option [ab]|group \d+)$/i;
function hasGenericLabels(viz) {
  if (!viz) return false;
  const candidates = [
    ...(viz.data?.labels || []),
    ...(viz.data?.map ? viz.data.map(d => d.label) : []),
    ...(viz.series?.map(s => s.name) || []),
    ...(viz.categories || []),
    ...(viz.data?.headers || []),
    ...(Array.isArray(viz.points) ? viz.points.map(p => p.label) : []),
  ].filter(Boolean);
  return candidates.some(l => GENERIC_LABEL_RE.test(String(l).trim()));
}

// ─── Visualization variety enforcer ──────────────────────────────────────────
// Ensures no two adjacent items share the same viz type.
function enforceVizVariety(items, vizKey = 'visualization', availableTypes) {
  if (!Array.isArray(items) || items.length === 0) return items;
  const pool = [...availableTypes];
  const used = {};
  pool.forEach(t => { used[t] = 0; });
  items.forEach(item => { const t = item[vizKey]?.type; if (t && used[t] !== undefined) used[t]++; });

  const result = [...items];
  let lastType = null;

  for (let i = 0; i < result.length; i++) {
    const currentType = result[i][vizKey]?.type;
    const isValid = currentType && pool.includes(currentType) && currentType !== lastType;
    if (!isValid) {
      // Reassign type only — preserve existing data, just log warning
      const candidates = pool.filter(t => t !== lastType);
      const sorted = candidates.sort((a, b) => (used[a] || 0) - (used[b] || 0));
      const pick = sorted[0];
      if (pick && result[i][vizKey]) {
        const old = result[i][vizKey].type;
        result[i][vizKey] = { ...result[i][vizKey], type: pick };
        console.log(`[viz-variety] item ${i}: type "${old}" → "${pick}" (preserved data)`);
        if (used[pick] !== undefined) used[pick]++;
        lastType = pick;
      }
    } else {
      if (used[currentType] !== undefined) used[currentType]++;
      lastType = currentType;
    }
    // Warn on generic labels — don't replace, just log for monitoring
    if (hasGenericLabels(result[i][vizKey])) {
      console.warn(`[viz-validate] item ${i} ("${result[i].name || result[i].label || result[i].title || '?'}") has generic viz labels`);
    }
  }
  return result;
}

// Generates a minimal valid placeholder visualization for a given type
function buildFallbackViz(type, title) {
  switch (type) {
    case 'line':    return { type: 'line', title, xLabel: 'Time', yLabel: 'Value', caption: `${title} trend over time.`, series: [{ name: 'Value', data: [{ x: '2020', y: 10 }, { x: '2021', y: 25 }, { x: '2022', y: 40 }, { x: '2023', y: 60 }] }] };
    case 'bar':     return { type: 'bar', title, xLabel: 'Category', yLabel: 'Score', caption: `Comparison of ${title}.`, data: [{ label: 'A', value: 45 }, { label: 'B', value: 72 }, { label: 'C', value: 58 }] };
    case 'scatter': return { type: 'scatter', title, xLabel: 'Input', yLabel: 'Output', caption: `Relationship in ${title}.`, points: [{ x: 0.2, y: 12, label: 'Low' }, { x: 0.5, y: 28, label: 'Mid' }, { x: 0.8, y: 45, label: 'High' }] };
    case 'radar':   return { type: 'radar', title, caption: `Multi-dimensional view of ${title}.`, categories: ['Accuracy', 'Speed', 'Cost', 'Recall', 'F1'], series: [{ name: 'Method A', values: [0.8, 0.6, 0.5, 0.7, 0.75] }, { name: 'Method B', values: [0.6, 0.9, 0.8, 0.5, 0.65] }] };
    case 'table':   return { type: 'table', title, caption: `Key metrics for ${title}.`, headers: ['Metric', 'Baseline', 'Proposed'], rows: [{ cells: ['Accuracy', '78%', '92%'] }, { cells: ['F1 Score', '0.75', '0.91'] }, { cells: ['Speed', '1.0×', '1.4×'] }] };
    case 'flow':    return { type: 'flow', title, caption: `Process steps for ${title}.`, steps: [{ title: 'Input', description: 'Gather data' }, { title: 'Process', description: 'Apply method' }, { title: 'Evaluate', description: 'Measure results' }, { title: 'Output', description: 'Final answer' }] };
    // Book section types
    case 'pie':           return { type: 'pie', title, caption: `Distribution in ${title}.`, data: { labels: ['Category A', 'Category B', 'Category C'], values: [45, 30, 25] } };
    case 'comparison_table': return { type: 'comparison_table', title, caption: `Comparison for ${title}.`, data: { headers: ['Feature', 'Option A', 'Option B'], rows: [['Quality', 'High', 'Medium'], ['Cost', 'Low', 'High']] } };
    case 'timeline':      return { type: 'timeline', title, caption: `Timeline of ${title}.`, data: { events: [{ year: '1990', label: 'Early' }, { year: '2000', label: 'Growth' }, { year: '2010', label: 'Mature' }, { year: '2023', label: 'Modern' }] } };
    default:        return { type: 'bar', title, xLabel: 'Category', yLabel: 'Value', caption: `${title} overview.`, data: [{ label: 'A', value: 50 }, { label: 'B', value: 70 }] };
  }
}

// ─── Paper prompt ──────────────────────────────────────────────────────────────
function buildPrompt(trimmed) {
  return `[INST] You are an expert at analyzing research papers and explaining them simply. Read the paper below and return a JSON object with:

1. "title": the paper title string
2. "summary": 3-4 sentence plain-English summary for a 16-year-old
3. "concepts": array of 8-12 concepts. Each MUST have ALL these fields:
   - "id": lowercase_snake_case unique id
   - "name": display name
   - "difficulty": "Basic" or "Intermediate" or "Advanced"
   - "explanation": 2-3 sentence beginner explanation with real-world analogy
   - "deeperExplanation": 4-6 sentence deeper accessible explanation
   - "keyPoints": array of 3-5 short bullet strings
   - "prerequisites": array of other concept ids (empty array if none)
   - "visualization": object — choose ONE type from the list below.

VISUALIZATION RULES (CRITICAL):
- You MUST use EVERY type at least once across all concepts.
- NO two consecutive concepts should share the same visualization type.
- Spread the types as evenly as possible — aim for roughly 2 concepts per type.
- Available types: "line", "bar", "scatter", "radar", "table", "flow"

Visualization formats:
  Trends over time → type "line":
  {"type":"line","title":"...","xLabel":"Year","yLabel":"Metric","caption":"One sentence.","series":[{"name":"A","data":[{"x":"2020","y":4.2},{"x":"2021","y":5.1}]}]}

  Comparing groups/categories → type "bar":
  {"type":"bar","title":"...","xLabel":"Category","yLabel":"Value","caption":"One sentence.","data":[{"label":"Model A","value":45},{"label":"Model B","value":72}]}

  Relationship between two variables → type "scatter":
  {"type":"scatter","title":"...","xLabel":"X Axis","yLabel":"Y Axis","caption":"One sentence.","points":[{"x":0.1,"y":8,"label":"A"},{"x":0.5,"y":14,"label":"B"},{"x":0.9,"y":20,"label":"C"}]}

  Comparing multiple dimensions/attributes → type "radar":
  {"type":"radar","title":"...","caption":"One sentence.","categories":["Speed","Accuracy","Cost","Recall"],"series":[{"name":"Method A","values":[0.8,0.6,0.4,0.9]},{"name":"Method B","values":[0.5,0.9,0.7,0.6]}]}

  Statistical or demographic comparison → type "table":
  {"type":"table","title":"...","caption":"One sentence.","headers":["Metric","Baseline","Proposed"],"rows":[{"cells":["Accuracy","81%","94%"]},{"cells":["F1 Score","0.79","0.93"]}]}

  Process, pipeline, or sequence → type "flow":
  {"type":"flow","title":"...","caption":"One sentence.","steps":[{"title":"Input","description":"Raw data"},{"title":"Process","description":"Transform"},{"title":"Output","description":"Result"}]}

IMPORTANT: Every concept MUST have a visualization. Use all 6 types. Do not repeat the same type more than twice in a row.

DATA LABELS RULES (CRITICAL):
- NEVER use generic labels like "A", "B", "C", "Category 1", "Method A", "Value".
- ALL bar labels, scatter point labels, radar categories, table headers, flow step titles, and series names MUST be specific to the concept being explained.
- Example for a "Transformer Attention" bar chart: labels like ["Self-Attention", "Cross-Attention", "Multi-Head", "Positional Encoding"] not ["A","B","C","D"].
- Example for "Learning Rate" line series name: "Training Loss" not "Value".
- The title must clearly state what is being measured or compared.
- The caption (1-2 sentences) must explain what insight the chart reveals about this concept.

Return ONLY raw JSON starting with { ending with }. No markdown, no explanation.

Paper text: ${trimmed} [/INST]`;
}

// ─── Paper provider machinery ──────────────────────────────────────────────────
async function callProvider(provider, messages, maxTokens = 4096) {
  if (provider.type === 'groq') {
    const completion = await groq.chat.completions.create({
      model: provider.model, messages, temperature: 0.15, max_tokens: maxTokens,
    });
    return completion.choices[0]?.message?.content || '';
  }
  if (provider.type === 'openrouter') {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Learnova',
      },
      body: JSON.stringify({ model: provider.model, messages, temperature: 0.15, max_tokens: maxTokens }),
    });
    const data = await res.json();
    if (!res.ok) throw Object.assign(new Error(data?.error?.message || 'OpenRouter error'), { status: res.status });
    return data.choices?.[0]?.message?.content || '';
  }
  throw new Error(`Unknown provider type: ${provider.type}`);
}

async function callWithFallback(rawText, buildMessages, maxTokens = 4096, providerList = PAPER_PROVIDERS) {
  const errors = [];
  for (const provider of providerList) {
    try {
      const trimmed = trimText(rawText, provider.maxChars);
      const messages = buildMessages(trimmed);
      console.log(`[fallback] Trying: ${provider.name} (${trimmed.length} chars)`);
      const content = await callProvider(provider, messages, maxTokens);
      console.log(`[fallback] ✅ Success with: ${provider.name}`);
      return { content, provider: provider.name };
    } catch (err) {
      const shouldFallback =
        err.status === 429 || err.status === 413 || err.status === 400 ||
        err.status === 503 || err.status === 502 ||
        (err.message && /(rate.?limit|no endpoints|decommission|too large|context.?length|provider.?error)/i.test(err.message));
      console.warn(`[fallback] ❌ ${provider.name}: ${err.message}`);
      errors.push({ provider: provider.name, error: err.message });
      if (!shouldFallback) throw err;
    }
  }
  throw new Error(`All providers failed:\n${errors.map(e => `  • ${e.provider}: ${e.error}`).join('\n')}`);
}

// ─── Gemini 1.5 Flash helper (1M token context, with retry on rate-limit) ──────
const GEMINI_MODEL = 'gemini-2.0-flash';
async function tryGeminiFlash(prompt, retryOnLimit = true) {
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: { temperature: 0.3, maxOutputTokens: 8192 },
  });
  try {
    const result = await model.generateContent(prompt);
    return extractJSON(result.response.text());
  } catch (err) {
    const isRateLimit = /429|RESOURCE_EXHAUSTED|quota/i.test(err.message || '');
    if (isRateLimit && retryOnLimit) {
      console.warn(`[gemini] Rate-limited — waiting 45s then retrying once...`);
      await new Promise(r => setTimeout(r, 45000));
      const result2 = await model.generateContent(prompt);
      return extractJSON(result2.response.text());
    }
    throw err;
  }
}

// ─── Timeout wrapper — fail fast so we don't hang waiting for slow providers ──
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms/1000}s`)), ms)
    ),
  ]);
}

// ─── Groq2 helper — books only, 128k context, full chapter ────────────────────
async function tryGroq2Books(prompt, maxTokens = 8000) {
  const res = await groq2.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: maxTokens,
  });
  const raw = res.choices?.[0]?.message?.content || '';
  return extractJSON(raw);
}

// ─── Cerebras helper (gpt-oss-120b, ~3000 tok/s) ────────────────────────────
async function tryCerebras(prompt, maxTokens = 8000, signal) {
  const r = await fetch('https://api.cerebras.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CEREBRAS_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-oss-120b',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_completion_tokens: maxTokens,
    }),
    signal,
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error?.message || `Cerebras error ${r.status}`);
  const raw = data.choices?.[0]?.message?.content || '';
  return extractJSON(raw);
}

// ─── OpenRouter helper ───────────────────────────────────────────────────
async function tryOpenRouterFree(prompt, maxTokens = 5000, signal) {
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'Learnova',
    },
    body: JSON.stringify({
      model: 'openrouter/auto',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: maxTokens,
    }),
    signal,
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error?.message || 'OpenRouter error');
  return extractJSON(data.choices?.[0]?.message?.content || '');
}

// ─── Race all book providers in parallel — return first winner ────────────────
async function raceBookProviders(prompt, maxTokens = 6000) {
  const aborts = [new AbortController(), new AbortController(), new AbortController()];
  const safeExtract = async (fn, abortIdx) => {
    try { return await fn(aborts[abortIdx].signal); }
    catch (e) { throw e; }
  };
  try {
    const result = await Promise.any([
      safeExtract(sig => tryCerebras(prompt, maxTokens, sig), 0),
      safeExtract(sig => tryOpenRouterFree(prompt, Math.min(maxTokens, 5000), sig), 1),
      safeExtract(sig => tryGroq2Books(prompt, maxTokens), 2),
    ]);
    aborts.forEach(a => { try { a.abort(); } catch {} });
    return result;
  } catch (aggErr) {
    throw new Error('All providers failed: ' + (aggErr?.errors?.map(e => e.message).join('; ') || String(aggErr)));
  }
}

// ─── /api/generate (research papers → Groq) ───────────────────────────────────
app.post('/api/generate', async (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'No text provided.' });
  console.log(`[generate] ${text.length} raw chars`);
  try {
    const { content: raw, provider } = await callWithFallback(
      text,
      (trimmed) => [{ role: 'user', content: buildPrompt(trimmed) }],
      4096,
      PAPER_PROVIDERS
    );
    console.log(`[generate] ${raw.length} chars received from ${provider}`);
    const parsed = extractJSON(raw);
    // Enforce viz variety: no two adjacent concepts share the same chart type
    if (Array.isArray(parsed.concepts)) {
      parsed.concepts = enforceVizVariety(
        parsed.concepts,
        'visualization',
        ['line', 'bar', 'scatter', 'radar', 'table', 'flow']
      );
    }
    const imageUrl = await fetchPexelsImage(parsed.title || '');
    if (imageUrl) console.log(`[pexels] ✅ image: ${imageUrl}`);
    else console.log('[pexels] ⚠️  no image');
    return res.json({ ...parsed, imageUrl: imageUrl || null, _provider: provider });
  } catch (err) {
    console.error('[generate] All providers failed:', err.message);
    return res.status(500).json({ error: err.message || 'Failed to analyze paper.' });
  }
});

// ─── /api/detect-chapters ─────────────────────────────────────────────────────
app.post('/api/detect-chapters', async (req, res) => {
  const { pagesText, totalPages } = req.body;
  if (!Array.isArray(pagesText) || pagesText.length === 0) {
    return res.status(400).json({ error: 'pagesText array required.' });
  }

  const scanPages = Math.min(50, pagesText.length);
  const extractedText = pagesText.slice(0, scanPages).join('\n\n--- PAGE BREAK ---\n\n');

  const prompt = `You are extracting the Table of Contents from a book. The text below is from the first ${scanPages} pages.

Instructions:
- Find the Table of Contents section (labeled "Contents", "Table of Contents", etc.)
- Extract EVERY chapter listed — do not stop early, get ALL of them
- Only include top-level chapters (skip sub-sections like 1.1, 2.3 etc.)
- Return ONLY a JSON array. Each object must have:
  "number": integer (chapter number, 0 if not numbered)
  "name": string (exact chapter title, never generic like "Section 1")
  "startPage": integer (page number from the TOC)
- If no TOC found, return []
- Do NOT truncate — return every single chapter in the TOC

Text:
${extractedText.slice(0, 40000)}`;

  console.log(`[detect-chapters] Scanning first ${scanPages} pages → Cerebras`);

  // ── 1. Cerebras PRIMARY (fastest) ─────────────────────────────────────────
  try {
    const parsed = await tryCerebras(prompt, 3000);
    const chapters = Array.isArray(parsed) ? parsed : [];
    if (chapters.length >= 2) {
      console.log(`[detect-chapters] ✅ Cerebras found ${chapters.length} chapters`);
      return res.json({ chapters, _provider: 'cerebras/gpt-oss-120b' });
    }
    console.warn('[detect-chapters] Cerebras returned < 2 chapters, trying OpenRouter...');
  } catch (cerErr) {
    console.warn(`[detect-chapters] Cerebras failed: ${cerErr.message}, trying OpenRouter...`);
  }

  // ── 2. OpenRouter fallback ─────────────────────────────────────────────────
  try {
    const parsed = await tryOpenRouterFree(prompt, 3000);
    const chapters = Array.isArray(parsed) ? parsed : [];
    if (chapters.length >= 2) {
      console.log(`[detect-chapters] ✅ OpenRouter found ${chapters.length} chapters`);
      return res.json({ chapters, _provider: 'openrouter/auto' });
    }
    console.warn('[detect-chapters] OpenRouter returned < 2 chapters, trying Gemini...');
  } catch (orErr) {
    console.warn(`[detect-chapters] OpenRouter failed: ${orErr.message}, trying Gemini...`);
  }

  // ── 3. Gemini last resort ──────────────────────────────────────────────────
  try {
    const parsed = await tryGeminiFlash(prompt);
    const chapters = Array.isArray(parsed) ? parsed : [];
    console.log(`[detect-chapters] ✅ Gemini found ${chapters.length} chapters`);
    return res.json({ chapters, _provider: 'gemini-2.0-flash' });
  } catch (err) {
    console.error(`[detect-chapters] All providers failed: ${err.message}`);
    return res.json({ chapters: [], error: err.message });
  }
});



// ─── /api/analyze-chapter (Fix 3: sections + compact visuals) ─────────────────
function buildAnalyzePrompt(chapterTitle, text) {
  return `You are a world-class interactive learning designer. Read the following book chapter and return ONLY a raw JSON object (no markdown, no code blocks) with exactly these keys:

chapter_title: string
chapter_number: integer (0 if unknown)
simple_summary: string - 150-200 words, plain English, like talking to a curious 16-year-old
key_takeaway: string - one powerful sentence, the single most important idea
learning_path: array of 4-6 strings - ordered steps a student must take to fully master this chapter

chapter_visualization: object - PREFER type "flow" to show the overall process or concept map. Use REAL names from the chapter:
  type: "flow" | "radar" | "comparison_table" | "timeline" | "bar" | "pie"
  title: string
  caption: string
  data: structure matching the type:
    "flow": {"steps": ["Step A", "Step B", "Step C", "Step D", "Step E"]}  <- PREFERRED for chapter overview
    "radar": {"categories": ["Memory","Speed","Accuracy"], "series": [{"name":"Approach A","values":[0.9,0.7,0.85]}]}
    "comparison_table": {"headers": ["Feature","Option A","Option B"], "rows": [["Speed","Fast","Slow"]]}
    "timeline": {"events": [{"year":"1950","label":"Event label"}]}
    "bar": {"labels": ["Item A","Item B","Item C"], "values": [72, 85, 91]}
    "pie": {"labels": ["Part A","Part B","Part C"], "values": [35, 40, 25]}

concept_map: object - a flow diagram showing how ALL major concepts in this chapter connect. Use REAL concept names from the chapter:
  type: "flow"
  title: string - e.g. "How Chapter Concepts Connect"
  caption: string - explain what this map shows
  data: {"steps": ["Concept A", "Concept B", "Concept C", "Concept D", "Concept E", "Concept F"]}

sections: array of objects, one per major topic. IMPORTANT: use "flow" for at least 2 sections, spread other types for variety:
  title: string
  content: string - 120-160 words, start with a real-world analogy, then explain the concept clearly
  deeper_explanation: string - 80-120 words, the why behind the concept, nuance, edge cases
  key_insight: string - one sentence takeaway
  common_misconception: string - the most common wrong assumption about this topic
  real_world_example: string - 40-60 words, one specific concrete real-world scenario
  interactive_question: string - one thought-provoking open-ended question for the student
  visualization: object using REAL names from chapter. Pick the best type for this section:
    type: "flow" | "bar" | "line" | "comparison_table" | "pie" | "timeline"
    title: string
    caption: string
    data: matching structure:
      "flow": {"steps": ["Step 1", "Step 2", "Step 3", "Step 4"]}  <- use for processes, sequences, pipelines
      "bar": {"labels": [...], "values": [...]}
      "line": {"xLabel":"...","yLabel":"...","series":[{"name":"...","data":[{"x":0,"y":0}]}]}
      "comparison_table": {"headers":[...],"rows":[[...]]}
      "pie": {"labels":[...],"values":[...]}
      "timeline": {"events":[{"year":"...","label":"..."}]}

concepts: array of 6-10 objects (key terms from the chapter):
  id: short lowercase string
  label: string - actual concept name from the chapter
  simple_explanation: string - 25-35 words plain English with analogy
  deeper_explanation: string - 60-80 words, how it works, significance
  difficulty: "Basic" | "Intermediate" | "Advanced"
  related_concepts: array of other concept id strings
  memory_hook: string - one vivid memorable trick to never forget this concept

connections: array of 3-5 objects:
  from: section title string
  to: section title string
  relationship: string - one sentence explaining how these topics connect

did_you_know: array of 3 strings - surprising, counterintuitive facts from this chapter

Return ONLY the JSON. No explanation before or after.

Chapter title: ${chapterTitle}
Chapter text: ${text}`;
}

// ─── Chapter analysis cache + in-flight dedup ────────────────────────────────
const chapterCache = new Map();
const chapterInFlight = new Map();

async function runChapterAnalysis({ text, chapterTitle, offset }) {
  const BATCH = 30000;
  const batch = text.slice(offset, offset + BATCH);
  const hasMore = (offset + BATCH) < text.length;
  const isContinuation = offset > 0;

  const continuationNote = isContinuation
    ? `NOTE: This is a CONTINUATION of the chapter. Only analyze NEW topics from this text segment. Do not repeat topics already covered.\n\n`
    : '';
  const prompt = `${continuationNote}${buildAnalyzePrompt(chapterTitle, batch)}`;

  const applyViz = (parsed) => {
    if (Array.isArray(parsed.sections)) {
      parsed.sections = enforceVizVariety(parsed.sections, 'visualization',
        ['bar', 'line', 'flow', 'comparison_table', 'pie', 'timeline']);
    }
    return { ...parsed, hasMore, nextOffset: offset + BATCH };
  };

  // Race all providers in parallel — fastest wins
  try {
    console.log(`[analyze-chapter] "${chapterTitle}" offset:${offset} — racing providers...`);
    const parsed = applyViz(await raceBookProviders(prompt, 6000));
    console.log(`[analyze-chapter] ✅ raceProviders succeeded`);
    return parsed;
  } catch (raceErr) {
    console.warn(`[analyze-chapter] ❌ race failed: ${raceErr.message.slice(0,100)}`);
  }

  // Last resort: Groq sequential fallback
  try {
    console.log(`[analyze-chapter] Trying Groq last resort...`);
    const { content: raw } = await withTimeout(callWithFallback(
      batch,
      (trimmed) => [{ role: 'user', content: `${continuationNote}${buildAnalyzePrompt(chapterTitle, trimmed)}` }],
      5000,
      [
        { name: 'Groq › llama-3.3-70b-versatile', type: 'groq', model: 'llama-3.3-70b-versatile', maxChars: 16000 },
        { name: 'Groq › llama-3.1-8b-instant',    type: 'groq', model: 'llama-3.1-8b-instant',    maxChars: 10000 },
      ]
    ), 30000, 'Groq');
    const parsed = applyViz(extractJSON(raw));
    console.log(`[analyze-chapter] ✅ Groq succeeded`);
    return parsed;
  } catch (err) {
    throw new Error('All providers failed: ' + err.message);
  }
}

app.post('/api/analyze-chapter', async (req, res) => {
  const { text, chapterTitle, offset = 0 } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'No text provided.' });
  if (!chapterTitle?.trim()) return res.status(400).json({ error: 'No chapterTitle provided.' });
  // Input size guard
  if (text.length > 500_000) return res.status(413).json({ error: 'Text too large. Max 500k characters.' });

  const cacheKey = `${chapterTitle}:${offset}:${text.slice(0, 64)}`;
  if (chapterCache.has(cacheKey)) {
    console.log(`[analyze-chapter] ✅ Cache hit for "${chapterTitle}" offset:${offset}`);
    return res.json({ ...chapterCache.get(cacheKey), _cached: true });
  }

  // Deduplicate concurrent identical requests
  if (chapterInFlight.has(cacheKey)) {
    try {
      const result = await chapterInFlight.get(cacheKey);
      return res.json(result);
    } catch (e) {
      return res.status(503).json({ userMessage: 'Chapter analysis failed. Please try again in a moment.' });
    }
  }

  const promise = runChapterAnalysis({ text, chapterTitle, offset });
  chapterInFlight.set(cacheKey, promise);
  try {
    const result = await promise;
    chapterCache.set(cacheKey, result);
    return res.json(result);
  } catch (err) {
    console.error(`[analyze-chapter] All providers failed: ${err.message}`);
    return res.status(503).json({ userMessage: 'Chapter analysis failed. Please try again in a moment.' });
  } finally {
    chapterInFlight.delete(cacheKey);
  }
});



// ─── /api/quiz-chapter ────────────────────────────────────────────────────────

function buildQuizPrompt(chapterTitle, text) {
  return `You are an expert teacher creating a quiz. Read the following book chapter thoroughly and generate exactly 30 multiple-choice questions that cover the entire chapter comprehensively. Make questions vary in difficulty — some easy, some medium, some challenging.

Return ONLY a raw JSON array (no markdown, no code blocks) of 30 objects. Each object has:
- question: string — the question text
- options: array of exactly 4 strings — the answer choices
- correct: integer 0-3 — index of the correct answer in options array
- explanation: string — maximum 30 words explaining why that answer is correct

Make sure questions cover all major topics in the chapter, not just the beginning.
Return ONLY the JSON array starting with [ and ending with ].

Chapter title: ${chapterTitle}
Chapter text: ${text}`;
}

app.post('/api/quiz-chapter', async (req, res) => {
  const { text, chapterTitle } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'No text provided.' });
  if (!chapterTitle?.trim()) return res.status(400).json({ error: 'No chapterTitle provided.' });
  if (text.length > 500_000) return res.status(413).json({ error: 'Text too large. Max 500k characters.' });

  console.log(`[quiz-chapter] "${chapterTitle}" — ${text.length} chars → Gemini`);
  const prompt = buildQuizPrompt(chapterTitle, trimText(text, 20000));

  // tryGemini alias — tryGeminiFlash is the actual implementation
  const tryGemini = tryGeminiFlash;
  try {
    const parsed = await tryGemini(prompt, true);
    const mcqs = Array.isArray(parsed) ? parsed : (parsed.questions || parsed.mcqs || []);
    console.log(`[quiz-chapter] ✅ Gemini succeeded — ${mcqs.length} questions`);
    return res.json({ mcqs, _provider: 'gemini-2.0-flash' });
  } catch (geminiErr) {
    const isRateLimit = /429|RESOURCE_EXHAUSTED|quota/i.test(geminiErr.message || '');
    console.warn(`[quiz-chapter] ❌ Gemini ${isRateLimit ? 'rate-limited' : 'failed'}: ${geminiErr.message}`);
  }

  try {
    console.log(`[quiz-chapter] Switching to backup AI (OpenRouter)...`);
    const parsed = await tryOpenRouterFree(prompt, 6000);
    const mcqs = Array.isArray(parsed) ? parsed : (parsed.questions || parsed.mcqs || []);
    console.log(`[quiz-chapter] ✅ OpenRouter succeeded — ${mcqs.length} questions`);
    return res.json({ mcqs, _provider: 'openrouter/auto' });
  } catch (err) {
    console.error(`[quiz-chapter] All providers failed: ${err.message}`);
    return res.status(503).json({
      userMessage: 'Quiz generation failed. Please try again in a moment.',
    });
  }
});

// ─── /api/explain-simpler ────────────────────────────────────────────────────
app.post('/api/explain-simpler', async (req, res) => {
  const { conceptName } = req.body;
  if (!conceptName) return res.status(400).json({ error: 'conceptName required.' });
  try {
    const { content } = await callWithFallback(
      conceptName,
      (name) => [{
        role: 'user',
        content: `[INST] Explain "${name}" in the simplest terms. Use a real-world analogy a 10-year-old would get. 2 sentences max. Plain text only. [/INST]`,
      }],
      150
    );
    return res.json({ explanation: content.trim() });
  } catch (err) {
    console.error('[explain-simpler] Error:', err.message);
    return res.status(500).json({ error: err.message || 'Failed.' });
  }
});

// ─── /api/papers — arXiv feed with 6h cache ──────────────────────────────────
const papersCache = { data: null, fetchedAt: 0 };
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

// ─── arXiv XML helpers ────────────────────────────────────────────────────────
function xmlTag(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = xml.match(re);
  return m ? m[1].replace(/<[^>]+>/g, '').trim() : '';
}
function xmlTagAll(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
  const results = [];
  let m;
  while ((m = re.exec(xml)) !== null) results.push(m[1].replace(/<[^>]+>/g, '').trim());
  return results;
}

// ─── arXiv category queries — all topics ─────────────────────────────────────
const ARXIV_QUERIES = [
  { q: 'cat:cs.AI+OR+cat:cs.LG+OR+cat:cs.CV',                                cat: 'Artificial Intelligence' },
  { q: 'cat:cs.CL+OR+cat:cs.NE+OR+cat:cs.CR+OR+cat:cs.IR',                    cat: 'Computer Science' },
  { q: 'cat:math.ST+OR+cat:math.CO+OR+cat:math.NA+OR+cat:math.PR',             cat: 'Mathematics' },
  { q: 'cat:q-bio.GN+OR+cat:q-bio.NC+OR+cat:q-bio.QM+OR+cat:q-bio.PE',        cat: 'Biology' },
  { q: 'cat:quant-ph+OR+cat:cond-mat.mes-hall+OR+cat:physics.gen-ph+OR+cat:hep-ph', cat: 'Physics' },
  { q: 'cat:econ.GN+OR+cat:econ.TH+OR+cat:econ.EM+OR+cat:econ.EC',            cat: 'Economics' },
  { q: 'cat:stat.ML+OR+cat:stat.AP+OR+cat:cs.DS+OR+cat:cs.SE',                 cat: 'Machine Learning' },
  { q: 'cat:q-bio.TO+OR+cat:q-bio.CB+OR+cat:physics.med-ph+OR+cat:q-bio.QM',  cat: 'Medicine' },
  { q: 'cat:physics.ao-ph+OR+cat:physics.geo-ph+OR+cat:physics.atm-clus+OR+cat:eess.SP', cat: 'Climate' },
];

function parseArxivXml(xml, cat) {
  const papers = [];
  const entryRe = /<entry>([\s\S]*?)<\/entry>/gi;
  let em;
  while ((em = entryRe.exec(xml)) !== null) {
    const entry = em[1];
    const id = xmlTag(entry, 'id')
      .replace('http://arxiv.org/abs/', '')
      .replace('https://arxiv.org/abs/', '')
      .trim();
    const title = xmlTag(entry, 'title').replace(/\s+/g, ' ');
    if (!title || !id) continue;
    const pdfM = entry.match(/<link[^>]*title="pdf"[^>]*href="([^"]+)"/i);
    papers.push({
      id: `arxiv-${id}`,
      title,
      authors: xmlTagAll(entry, 'name').slice(0, 6),
      abstract: xmlTag(entry, 'summary').replace(/\s+/g, ' '),
      source: 'arxiv',
      pdfUrl: pdfM ? pdfM[1] : `https://arxiv.org/pdf/${id}`,
      publishedDate: xmlTag(entry, 'published').slice(0, 10),
      category: cat,
    });
  }
  return papers;
}

async function fetchArxiv() {
  // Fire ALL category queries in parallel — 7x faster than sequential
  const results = await Promise.allSettled(
    ARXIV_QUERIES.map(async ({ q, cat }) => {
      const url = `https://export.arxiv.org/api/query?search_query=${q}&sortBy=submittedDate&sortOrder=descending&start=0&max_results=20`;
      const r = await fetch(url, { signal: AbortSignal.timeout(12000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const xml = await r.text();
      const papers = parseArxivXml(xml, cat);
      console.log(`[arxiv] ✅ ${cat}: ${papers.length} papers`);
      return papers;
    })
  );
  return results.flatMap((r, i) => {
    if (r.status === 'rejected') {
      console.warn(`[arxiv] ❌ ${ARXIV_QUERIES[i].cat}: ${r.reason?.message}`);
      return [];
    }
    return r.value;
  });
}

// Round-robin interleave across categories so page 1 has a natural mix
function interleavePapers(papers) {
  const byCategory = {};
  papers.forEach(p => {
    const cat = p.category || 'Research';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(p);
  });
  // Sort newest-first within each category
  Object.values(byCategory).forEach(list =>
    list.sort((a, b) => (b.publishedDate || '').localeCompare(a.publishedDate || ''))
  );
  // Round-robin
  const result = [];
  const cats = Object.keys(byCategory);
  let hasMore = true;
  while (hasMore) {
    hasMore = false;
    for (const cat of cats) {
      if (byCategory[cat].length > 0) { result.push(byCategory[cat].shift()); hasMore = true; }
    }
  }
  return result;
}

app.get('/api/papers', async (req, res) => {
  const now = Date.now();
  const page     = Math.max(1, parseInt(req.query.page  || '1', 10));
  const limit    = Math.min(30, Math.max(6, parseInt(req.query.limit || '12', 10)));
  const category = (req.query.category || '').trim();

  const serveData = (all) => {
    const pool = category
      ? all.filter(p => (p.category || '').toLowerCase() === category.toLowerCase())
      : all;
    const start = (page - 1) * limit;
    const slice = pool.slice(start, start + limit);
    return res.json({ papers: slice, total: pool.length, page, limit, hasMore: start + limit < pool.length });
  };

  if (papersCache.data && (now - papersCache.fetchedAt) < CACHE_TTL) {
    console.log('[papers] Serving from cache');
    return serveData(papersCache.data);
  }
  console.log('[papers] Fetching fresh papers...');
  try {
    const arxivPapers = await fetchArxiv();
    const seen = new Set();
    const deduped = arxivPapers.filter(p => {
      const key = p.title.toLowerCase().replace(/\s+/g, ' ').slice(0, 60);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const interleaved = interleavePapers(deduped);
    papersCache.data = interleaved;
    papersCache.fetchedAt = now;
    console.log(`[papers] ✅ ${interleaved.length} papers (arXiv)`);
    return serveData(interleaved);
  } catch (err) {
    console.error('[papers] Error:', err.message);
    if (papersCache.data) return serveData(papersCache.data);
    return res.status(500).json({ error: 'Failed to fetch papers.' });
  }
});

// ─── /api/papers/search — arXiv full-text search ─────────────────────────────
app.get('/api/papers/search', async (req, res) => {
  const { q } = req.query;
  if (!q?.trim()) return res.status(400).json({ error: 'q query param required.' });
  try {
    const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(q)}&sortBy=relevance&sortOrder=descending&start=0&max_results=20`;
    const r = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!r.ok) return res.status(502).json({ error: `arXiv search failed: ${r.status}` });
    const xml = await r.text();
    const papers = parseArxivXml(xml, 'Research');
    return res.json(papers);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});


// ─── /api/fetch-pdf — proxy PDF download + extract text ──────────────────────
app.get('/api/fetch-pdf', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send('url param required');
  try {
    const pdfRes = await fetch(String(url), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Learnova/1.0)',
        'Accept': 'application/pdf,*/*',
      },
      signal: AbortSignal.timeout(20000),
    });
    if (!pdfRes.ok) return res.status(502).send(`PDF fetch failed: ${pdfRes.status}`);

    // Guard: reject HTML responses (landing pages, paywalls, redirects)
    const ct = pdfRes.headers.get('content-type') || '';
    if (!ct.includes('pdf') && !ct.includes('octet-stream')) {
      console.warn(`[fetch-pdf] Non-PDF content-type: ${ct} for ${url}`);
      return res.status(415).send(`Not a PDF (got ${ct}). The URL may be a landing page, not a direct PDF.`);
    }

    const buf = Buffer.from(await pdfRes.arrayBuffer());

    // Double-check: PDF magic bytes %PDF
    if (buf.slice(0, 4).toString('ascii') !== '%PDF') {
      console.warn(`[fetch-pdf] Missing %PDF header for ${url}`);
      return res.status(415).send('URL did not return a valid PDF file.');
    }

    const data = await pdfParse(buf, { max: 0 });
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.send(data.text || '');
  } catch (err) {
    console.error('[fetch-pdf] Error:', err.message);
    return res.status(500).send('Failed to fetch PDF: ' + err.message);
  }
});

app.listen(PORT, () => console.log(`✅ PaperMap backend | http://localhost:${PORT}`));


