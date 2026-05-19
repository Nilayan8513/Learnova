'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import UploadSection, { PDFDetectionResult } from './components/UploadSection';
import ConceptCard, { Concept } from './components/ConceptCard';
import ChapterSelection, { Chapter, ChapterMode } from './components/ChapterSelection';
import BookResults, { ChapterResult } from './components/BookResults';
import ResearchFeed from './components/ResearchFeed';
import { API_BASE } from './lib/api';

type PaperData = { title: string; summary: string; concepts: Concept[]; imageUrl?: string | null };

type AppMode =
  | { view: 'home' }
  | { view: 'too-large'; pageCount: number }
  | { view: 'paper-loading' }
  | { view: 'paper-result'; data: PaperData }
  | { view: 'book-select'; pageCount: number; pagesText: string[]; fileName: string }
  | { view: 'book-loading'; chapters: Chapter[]; pagesText: string[]; chapterMode: ChapterMode }
  | { view: 'book-result'; results: ChapterResult[]; chapterMode: ChapterMode; bookMeta: { pageCount: number; pagesText: string[]; fileName: string } };

// ─── Detect topic ─────────────────────────────────────────────────────────────
function detectTopic(title: string): string {
  const t = title.toLowerCase();
  if (/\b(ai|artificial intelligence|neural|llm|language model|machine learning|deep learning|gpt|claude|transformer|attention|embedding)\b/.test(t)) return 'Artificial Intelligence';
  if (/\b(retrieval|rag|graph|knowledge base|vector|search|index|augmented)\b/.test(t)) return 'Information Retrieval';
  if (/\b(agent|agentic|multi.agent|autonomous|robot|planning|decision)\b/.test(t)) return 'Autonomous Systems';
  if (/\b(labor|market|econom|employ|wage|income|work|job|gdp|growth|finance|financial|trade)\b/.test(t)) return 'Economics';
  if (/\b(bio|cell|protein|dna|gene|health|medic|drug|neuro|brain|genome|cancer|clinical)\b/.test(t)) return 'Biology & Medicine';
  if (/\b(physics|quantum|particle|wave|energy|relativity|atom|nuclear|optic)\b/.test(t)) return 'Physics';
  if (/\b(climate|environment|carbon|emission|solar|wind|sustain|ecology)\b/.test(t)) return 'Climate & Environment';
  if (/\b(social|society|human|behav|psych|cognit|mental|survey|politic)\b/.test(t)) return 'Social Science';
  if (/\b(security|privacy|crypto|attack|defense|cyber|network|protocol)\b/.test(t)) return 'Cybersecurity';
  if (/\b(vision|image|video|object|detect|segment|diffusion|generat)\b/.test(t)) return 'Computer Vision';
  if (/\b(nlp|text|language|speech|translation|sentiment|tokeniz|bert|gpt)\b/.test(t)) return 'Natural Language Processing';
  return 'Research Paper';
}

// ─── Hero Image ───────────────────────────────────────────────────────────────
function HeroImage({ url }: { url?: string | null }) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { setError(false); setLoaded(false); }, [url]);
  return (
    <div style={{ borderRadius: '16px', overflow: 'hidden', height: '320px', width: '100%', background: '#B2C5C0', position: 'relative' }}>
      {url && !loaded && !error && (
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,#B2C5C0 0%,#C8D9D4 50%,#B2C5C0 100%)', backgroundSize: '200% 100%', animation: 'shimmer 1.6s ease-in-out infinite' }} />
      )}
      {url && !error && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="Research illustration" onLoad={() => setLoaded(true)} onError={() => setError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: loaded ? 1 : 0, transition: 'opacity 0.6s ease' }} />
      )}
    </div>
  );
}

// ─── Book loading screen ───────────────────────────────────────────────────────
function BookLoadingScreen({ chapters, mode }: { chapters: Chapter[]; mode?: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex(i => (i + 1) % chapters.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [chapters.length]);

  return (
    <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '80px 24px' }}>
      <div style={{ textAlign: 'center', maxWidth: '400px' }}>
        {/* Animated book icon */}
        <div style={{ marginBottom: '32px' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ animation: 'spin 2s linear infinite' }}>
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
        </div>

        <h2 style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontSize: '24px', fontWeight: 700, color: '#111', marginBottom: '8px' }}>
          {mode === 'quiz' ? 'Generating quiz questions...' : 'Analyzing chapter with AI...'}
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '28px' }}>
          {mode === 'quiz' ? 'Creating 30 MCQ questions from this chapter' : 'Reading the full chapter and building your visual explanation'}
        </p>

        {/* Currently processing */}
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 20px', marginBottom: '16px' }}>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Now processing</p>
          <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Chapter {chapters[currentIndex]?.num}: {chapters[currentIndex]?.title}
          </p>
        </div>

        {/* Loading bar */}
        <div style={{ height: '4px', background: 'var(--bg-muted)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: '60%',
            background: 'linear-gradient(90deg, var(--accent), #f97316)',
            borderRadius: '2px',
            animation: 'shimmer 1.5s ease-in-out infinite',
            backgroundSize: '200% 100%',
          }} />
        </div>
      </div>
    </main>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const [mode, setMode] = useState<AppMode>({ view: 'home' });
  const [scrolled, setScrolled] = useState(false);
  const [activeConcept, setActiveConcept] = useState<string | null>(null);
  const [hoveredConcept, setHoveredConcept] = useState<string | null>(null);
  const [sidebarFixed, setSidebarFixed] = useState(false);
  const [sidebarTop, setSidebarTop] = useState(0);
  const [apiError, setApiError] = useState<string | null>(null);
  const [homeTab, setHomeTab] = useState<'feed' | 'upload'>('feed');
  const [tabKey, setTabKey] = useState(0);          // force re-mount to re-trigger animation
  const prevTab = useRef<'feed' | 'upload'>('feed'); // track last tab for slide direction

  const switchTab = useCallback((tab: 'feed' | 'upload') => {
    if (tab === homeTab) return;
    prevTab.current = homeTab;
    setHomeTab(tab);
    setTabKey(k => k + 1);
  }, [homeTab]);

  const sidebarObserver = useRef<IntersectionObserver | null>(null);
  const revealObserver = useRef<IntersectionObserver | null>(null);
  const firstCardRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  // History stack — stores modes to restore when back is pressed
  const modeStack = useRef<AppMode[]>([]);

  // Push a new view onto the history stack and update browser history
  const navigateTo = useCallback((newMode: AppMode) => {
    modeStack.current.push(mode);
    window.history.pushState({ depth: modeStack.current.length }, '');
    setMode(newMode);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Browser / mouse back button support
  useEffect(() => {
    window.history.replaceState({ depth: 0 }, '');
    const onPopState = () => {
      if (modeStack.current.length > 0) {
        const prev = modeStack.current.pop()!;
        setMode(prev);
      } else {
        setMode({ view: 'home' });
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const paperData = mode.view === 'paper-result' ? mode.data : null;

  // Navbar shrink
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  // Sidebar pin
  useEffect(() => {
    if (!paperData) return;
    const measure = () => {
      const card = firstCardRef.current;
      const cont = contentRef.current;
      if (!card || !cont) return;
      const cardPageTop = card.getBoundingClientRect().top + window.scrollY;
      const contPageTop = cont.getBoundingClientRect().top + window.scrollY;
      setSidebarTop(cardPageTop - contPageTop);
      const threshold = cardPageTop - 80;
      const onScroll = () => setSidebarFixed(window.scrollY >= threshold);
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
      return () => window.removeEventListener('scroll', onScroll);
    };
    const t = setTimeout(() => { measure(); }, 300);
    return () => clearTimeout(t);
  }, [paperData]);

  // Intersection observers for concepts
  useEffect(() => {
    if (!paperData) return;
    const timer = setTimeout(() => {
      revealObserver.current?.disconnect();
      revealObserver.current = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
      }, { rootMargin: '0px 0px -40px 0px' });
      sidebarObserver.current?.disconnect();
      sidebarObserver.current = new IntersectionObserver(entries => {
        const visible = entries.filter(e => e.isIntersecting);
        if (!visible.length) return;
        const topmost = visible.reduce((best, e) => e.boundingClientRect.top < best.boundingClientRect.top ? e : best);
        setActiveConcept(topmost.target.id.replace('concept-', ''));
      }, { root: null, rootMargin: '-20% 0px -60% 0px', threshold: 0 });
      paperData.concepts.forEach(c => {
        const el = document.getElementById(`concept-${c.id}`);
        if (el) { sidebarObserver.current?.observe(el); el.classList.add('card-reveal'); revealObserver.current?.observe(el); }
      });
    }, 250);
    return () => { clearTimeout(timer); sidebarObserver.current?.disconnect(); revealObserver.current?.disconnect(); };
  }, [paperData]);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleDetected = useCallback(async (result: PDFDetectionResult) => {
    setApiError(null);

    if (result.type === 'too-large') {
      navigateTo({ view: 'too-large', pageCount: result.pageCount });
      return;
    }

    if (result.type === 'paper') {
      setMode({ view: 'paper-loading' });
      try {
        const trimmed = result.text.replace(/\s+/g, ' ').trim().slice(0, 6000);
        const res = await fetch(`${API_BASE}/api/generate`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: trimmed }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Backend error');
        navigateTo({ view: 'paper-result', data });
      } catch (err: unknown) {
        setApiError(err instanceof Error ? err.message : 'Failed to analyze paper.');
        setMode({ view: 'home' });
      }
      return;
    }

    if (result.type === 'book') {
      navigateTo({ view: 'book-select', pageCount: result.pageCount, pagesText: result.pagesText, fileName: result.fileName });
    }
  }, [navigateTo]);

  const handleVisualize = useCallback(async (chapters: Chapter[], pagesText: string[], chapterMode: ChapterMode) => {
    const bookMeta = mode.view === 'book-select'
      ? { pageCount: mode.pageCount, pagesText: mode.pagesText, fileName: mode.fileName }
      : { pageCount: 0, pagesText, fileName: '' };
    setMode({ view: 'book-loading', chapters, pagesText, chapterMode });
    const results: ChapterResult[] = [];

    for (const ch of chapters) {
      const startIdx = Math.max(0, ch.startPage - 1);
      const endIdx = Math.min(pagesText.length - 1, ch.endPage - 1);
      const chapterText = pagesText.slice(startIdx, endIdx + 1).join('\n');

      const endpoint = chapterMode === 'quiz' ? '/api/quiz-chapter' : '/api/analyze-chapter';

      try {
        const res = await fetch(`${API_BASE}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: chapterText, chapterTitle: ch.title }),
        });
        const data = await res.json();
        if (!res.ok) {
          results.push({
            chapterNum: ch.num,
            chapterTitle: ch.title,
            simple_summary: data.userMessage || 'Chapter analysis failed. Please try a different chapter or try again in a moment.',
            concepts: [],
            mcqs: [],
            sections: [],
            failed: true,
            failMessage: data.userMessage,
          });
          continue;
        }
        if (chapterMode === 'quiz') {
          results.push({
            chapterNum: ch.num,
            chapterTitle: ch.title,
            chapter_title: ch.title,
            simple_summary: '',
            sections: [],
            concepts: [],
            mcqs: Array.isArray(data.mcqs) ? data.mcqs : [],
          });
        } else {
          results.push({
            chapterNum: ch.num,
            chapterTitle: ch.title,
            chapter_title: data.chapter_title || ch.title,
            simple_summary: data.simple_summary || '',
            sections: Array.isArray(data.sections) ? data.sections : [],
            concepts: Array.isArray(data.concepts) ? data.concepts : [],
            mcqs: [],
            hasMore: data.hasMore ?? false,
            nextOffset: data.nextOffset ?? 30000,
            rawText: chapterText,
          });
        }
      } catch (err) {
        results.push({
          chapterNum: ch.num,
          chapterTitle: ch.title,
          simple_summary: 'Chapter analysis failed. Please try a different chapter or try again in a moment.',
          concepts: [], mcqs: [], sections: [],
          failed: true,
          failMessage: err instanceof Error ? err.message : 'unknown error',
        });
      }
    }

    navigateTo({ view: 'book-result', results, chapterMode, bookMeta });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, navigateTo]);

  const handleReset = () => {
    modeStack.current = []; // clear history stack
    window.history.replaceState({ depth: 0 }, '');
    setMode({ view: 'home' });
    setApiError(null);
    setActiveConcept(null);
  };

  // Analyze a paper fetched from the research feed (text already extracted)
  const handleAnalyzePaper = useCallback(async (text: string, title: string) => {
    setApiError(null);
    setMode({ view: 'paper-loading' });
    try {
      const trimmed = text.replace(/\s+/g, ' ').trim().slice(0, 6000);
      const res = await fetch(`${API_BASE}/api/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Backend error');
      if (title && (!data.title || data.title.length < 5)) data.title = title;
      navigateTo({ view: 'paper-result', data });
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Failed to analyze paper.');
      setMode({ view: 'home' });
    }
  }, [navigateTo]);

  const scrollToConcept = (id: string) => {
    const el = document.getElementById(`concept-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.style.outline = '2px solid var(--accent)'; el.style.outlineOffset = '4px';
      setTimeout(() => { el.style.outline = ''; el.style.outlineOffset = ''; }, 1000);
    }
  };

  const today = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  const topic = paperData ? detectTopic(paperData.title) : '';

  // ─── Render ──────────────────────────────────────────────────────────────────

  const isProcessing = mode.view === 'paper-loading' || mode.view === 'book-loading';

  return (
    <>
      {/* NAVBAR */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        height: scrolled ? '52px' : '64px',
        background: scrolled ? 'rgba(245,244,239,0.96)' : '#F5F4EF',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'none',
        transition: 'height 0.3s ease, background 0.3s ease',
        display: 'flex', alignItems: 'center',
        padding: '0 48px', justifyContent: 'space-between',
      }}>
        <div onClick={handleReset} style={{ cursor: 'pointer' }}>
          <span style={{
            fontFamily: '"Instrument Serif", Georgia, serif',
            fontSize: scrolled ? '17px' : '21px', fontWeight: 700,
            letterSpacing: '-0.02em', color: '#111',
            transition: 'font-size 0.3s ease',
          }}>
            {scrolled && mode.view !== 'home' ? 'LN' : 'Learnova'}
          </span>
        </div>
        {mode.view !== 'home' && (
          <button onClick={handleReset} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '14px', color: '#666', fontFamily: 'inherit', padding: '6px 0',
          }}
            onMouseEnter={e => (e.currentTarget.style.color = '#111')}
            onMouseLeave={e => (e.currentTarget.style.color = '#666')}>
            {mode.view === 'book-select' || mode.view === 'book-result' || mode.view === 'book-loading' ? 'Upload new book' : 'New paper'}
          </button>
        )}
      </header>

      {/* PAGE BACKGROUND */}
      <div style={{ background: '#F5F4EF', minHeight: '100vh' }}>

        {/* ── BOOK LOADING ── */}
        {mode.view === 'book-loading' && (
          <BookLoadingScreen chapters={mode.chapters} mode={mode.chapterMode} />
        )}

        {/* ── PAPER LOADING (no full-page spinner needed — just blocks) ── */}
        {mode.view === 'paper-loading' && (
          <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
            <div style={{ textAlign: 'center' }}>
              <span className="spinner spinner-dark" style={{ width: '28px', height: '28px', borderWidth: '2px' }} />
              <p style={{ marginTop: '16px', fontSize: '14px', color: 'var(--text-muted)' }}>Analyzing paper…</p>
            </div>
          </main>
        )}

        {/* ── BOOK RESULTS ── */}
        {mode.view === 'book-result' && (
          <div style={{ paddingTop: '80px' }}>
            <BookResults
              results={mode.results}
              chapterMode={mode.chapterMode}
              onReset={handleReset}
              onBackToChapters={() => setMode({ view: 'book-select', ...mode.bookMeta })}
            />
          </div>
        )}

        {/* ── BOOK CHAPTER SELECTION ── */}
        {mode.view === 'book-select' && (
          <div style={{ paddingTop: '80px' }}>
            <ChapterSelection
              bookTitle={mode.fileName}
              pageCount={mode.pageCount}
              pagesText={mode.pagesText}
              onVisualize={handleVisualize}
            />
          </div>
        )}

        {/* ── HOME / TOO-LARGE ── */}
        {(mode.view === 'home' || mode.view === 'too-large') && (
          <div className="tab-panel-host" style={{ paddingTop: '80px', minHeight: '100vh' }}>

            {/* ── HERO ── */}
            <div style={{ textAlign: 'center', maxWidth: '520px', margin: '0 auto', padding: '56px 24px 40px' }}>
              <h1 style={{
                fontFamily: '"Instrument Serif", Georgia, serif',
                fontSize: 'clamp(38px, 5.5vw, 58px)', fontWeight: 700,
                lineHeight: 1.05, letterSpacing: '-0.025em', color: '#111', marginBottom: '14px',
              }}>Learnova</h1>
              <p style={{ fontSize: '16px', color: '#888', fontWeight: 300, lineHeight: 1.6 }}>
                Discover research or analyze your own PDF.
              </p>
            </div>

            {/* ── PILL TAB SWITCHER ── */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '36px' }}>
              <div style={{
                position: 'relative',
                display: 'inline-flex',
                background: '#EAE9E3',
                borderRadius: '999px',
                padding: '4px',
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.10)',
              }}>
                {/* Sliding indicator */}
                <div style={{
                  position: 'absolute',
                  top: '4px', bottom: '4px',
                  left: '4px',
                  width: 'calc(50% - 4px)',
                  background: '#111',
                  borderRadius: '999px',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.22)',
                  transform: homeTab === 'upload' ? 'translateX(100%)' : 'translateX(0%)',
                  transition: 'transform 0.3s cubic-bezier(0.34,1.3,0.64,1)',
                  pointerEvents: 'none',
                }} />

                {/* Latest Research button */}
                <button
                  onClick={() => switchTab('feed')}
                  style={{
                    position: 'relative', zIndex: 1,
                    border: 'none', cursor: 'pointer', borderRadius: '999px',
                    padding: '8px 26px', fontSize: '13px', fontWeight: 600,
                    fontFamily: 'Inter, sans-serif', letterSpacing: '0.01em',
                    background: 'transparent',
                    color: homeTab === 'feed' ? '#fff' : '#888',
                    transition: 'color 0.25s ease',
                    minWidth: '140px',
                  }}
                >
                  Latest Research
                </button>

                {/* Upload PDF button */}
                <button
                  onClick={() => switchTab('upload')}
                  style={{
                    position: 'relative', zIndex: 1,
                    border: 'none', cursor: 'pointer', borderRadius: '999px',
                    padding: '8px 26px', fontSize: '13px', fontWeight: 600,
                    fontFamily: 'Inter, sans-serif', letterSpacing: '0.01em',
                    background: 'transparent',
                    color: homeTab === 'upload' ? '#fff' : '#888',
                    transition: 'color 0.25s ease',
                    minWidth: '140px',
                  }}
                >
                  Upload PDF
                </button>
              </div>
            </div>

            {/* ── UPLOAD TAB ── */}
            {homeTab === 'upload' && (
              <div
                key={`upload-${tabKey}`}
                className="tab-enter-right"
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 24px 80px' }}
              >
                {mode.view === 'too-large' && (
                  <div style={{
                    background: '#fff', border: '1px solid var(--border)', borderRadius: '14px',
                    padding: '18px 24px', marginBottom: '24px', maxWidth: '480px', width: '100%', textAlign: 'center',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                  }}>
                    <p style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 600, marginBottom: '4px' }}>
                      <span style={{ color: 'var(--accent)' }}>⊘</span>{' '}
                      PDF too large ({mode.pageCount} pages detected)
                    </p>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      Please upload a PDF with under 500 pages for the best experience.
                    </p>
                  </div>
                )}
                <UploadSection onDetected={handleDetected} isProcessing={isProcessing} />
                {apiError && (
                  <p style={{ marginTop: '16px', fontSize: '13px', color: 'var(--accent)', textAlign: 'center', maxWidth: '480px' }}>
                    {apiError}
                  </p>
                )}
              </div>
            )}

            {/* ── FEED TAB ── */}
            {homeTab === 'feed' && (
              <div key={`feed-${tabKey}`} className="tab-enter-left">
                <ResearchFeed onAnalyzePaper={handleAnalyzePaper} />
              </div>
            )}
          </div>
        )}

        {/* ── PAPER RESULTS ── */}
        {mode.view === 'paper-result' && paperData && (
          <div style={{ paddingTop: '64px' }}>
            {/* HERO */}
            <section style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto', padding: '80px 32px 56px' }}>
              <p className="hero-up-0" style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#999', marginBottom: '20px' }}>{topic}</p>
              <h1 style={{
                fontFamily: '"Instrument Serif", Georgia, serif',
                fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700,
                lineHeight: 1.15, letterSpacing: '-0.02em', color: '#111', marginBottom: '16px',
              }}>{paperData.title}</h1>
              <p className="hero-up-1" style={{ fontSize: '13px', color: '#999', marginBottom: '28px' }}>{today}</p>
              <div className="hero-up-2" style={{ marginBottom: '40px' }}>
                <button style={{
                  background: '#111', color: '#fff', border: 'none',
                  borderRadius: '999px', padding: '10px 24px',
                  fontSize: '13px', fontWeight: 500, fontFamily: 'inherit',
                  cursor: 'default', letterSpacing: '0.01em',
                }}>Download PDF</button>
              </div>
              <div className="hero-up-3"><HeroImage url={paperData.imageUrl} /></div>
            </section>

            {/* CONTENT — sidebar + cards */}
            <div ref={contentRef} style={{ position: 'relative', paddingBottom: '120px' }}>
              <aside style={{
                position: sidebarFixed ? 'fixed' : 'absolute',
                top: sidebarFixed ? '80px' : `${sidebarTop}px`,
                left: sidebarFixed
                  ? 'max(12px, calc((100vw - 720px) / 2 - 210px))'
                  : 'max(12px, calc((100% - 720px) / 2 - 210px))',
                width: '190px', height: 'calc(100vh - 100px)',
                overflowY: 'auto', zIndex: 10,
              }}>
                <nav>
                  {paperData.concepts.map(c => (
                    <span key={c.id}
                      className={`sidebar-link ${(hoveredConcept ?? activeConcept) === c.id ? 'active' : ''}`}
                      onClick={() => scrollToConcept(c.id)}>
                      {c.name}
                    </span>
                  ))}
                </nav>
              </aside>

              <div ref={firstCardRef} style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 24px 0' }}>
                {/* Stats bar */}
                <div style={{ display: 'flex', gap: '20px', marginBottom: '32px', fontSize: '12px', color: '#999', paddingBottom: '20px', borderBottom: '1px solid #E0DFD8' }}>
                  <span>{paperData.concepts.length} concepts</span>
                  <span style={{ color: 'var(--green)' }}>{paperData.concepts.filter(c => c.difficulty === 'Basic').length} Basic</span>
                  <span style={{ color: 'var(--orange)' }}>{paperData.concepts.filter(c => c.difficulty === 'Intermediate').length} Intermediate</span>
                  <span style={{ color: 'var(--red)' }}>{paperData.concepts.filter(c => c.difficulty === 'Advanced').length} Advanced</span>
                </div>

                {/* Concept cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {paperData.concepts.map(c => (
                    <div key={c.id} onMouseEnter={() => setHoveredConcept(c.id)} onMouseLeave={() => setHoveredConcept(null)}>
                      <ConceptCard concept={c} allConcepts={paperData.concepts} onPrerequisiteClick={scrollToConcept} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
