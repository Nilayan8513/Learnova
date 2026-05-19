'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE } from '../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────
export type Paper = {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  source: 'arxiv' | 'semantic-scholar';
  pdfUrl: string | null;
  publishedDate: string | null;
  category: string;
};

type Props = {
  onAnalyzePaper: (text: string, title: string) => void;
};

// ─── Category list ────────────────────────────────────────────────────────────
const CATEGORIES = ['All', 'Artificial Intelligence', 'Machine Learning', 'Computer Science', 'Biology', 'Physics', 'Economics', 'Mathematics', 'Medicine', 'Climate'];

// ─── Format date ──────────────────────────────────────────────────────────────
function formatDate(d: string | null) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return d; }
}

// ─── Source badge ─────────────────────────────────────────────────────────────
function SourceBadge({ source }: { source: string }) {
  const isArxiv = source === 'arxiv';
  return (
    <span style={{
      display: 'inline-block', fontSize: 9, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.08em',
      padding: '2px 7px', borderRadius: 999,
      background: isArxiv ? '#EEF2FF' : '#F0FDF4',
      color: isArxiv ? '#4338CA' : '#166534',
      border: `1px solid ${isArxiv ? '#C7D2FE' : '#BBF7D0'}`,
    }}>
      {isArxiv ? 'arXiv' : 'S2'}
    </span>
  );
}

// ─── Skeleton card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{ background: '#fff', border: '1px solid #E0DFD8', borderRadius: 12, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ width: 36, height: 16, borderRadius: 999, background: '#EAE9E3', animation: 'shimmer 1.5s ease-in-out infinite', backgroundSize: '200% 100%' }} />
        <div style={{ width: 80, height: 12, borderRadius: 4, background: '#EAE9E3', animation: 'shimmer 1.5s ease-in-out infinite', marginLeft: 'auto' }} />
      </div>
      <div style={{ height: 18, borderRadius: 4, background: '#EAE9E3', animation: 'shimmer 1.5s ease-in-out infinite' }} />
      <div style={{ height: 14, width: '70%', borderRadius: 4, background: '#EAE9E3', animation: 'shimmer 1.5s ease-in-out infinite' }} />
      <div style={{ height: 12, borderRadius: 4, background: '#EAE9E3', animation: 'shimmer 1.5s ease-in-out infinite' }} />
      <div style={{ height: 12, width: '85%', borderRadius: 4, background: '#EAE9E3', animation: 'shimmer 1.5s ease-in-out infinite' }} />
      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
        <div style={{ width: 110, height: 32, borderRadius: 999, background: '#EAE9E3', animation: 'shimmer 1.5s ease-in-out infinite' }} />
        <div style={{ width: 150, height: 32, borderRadius: 999, background: '#EAE9E3', animation: 'shimmer 1.5s ease-in-out infinite' }} />
      </div>
    </div>
  );
}

// ─── Paper card ───────────────────────────────────────────────────────────────
function PaperCard({ paper, onAnalyze }: { paper: Paper; onAnalyze: (text: string, title: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!paper.pdfUrl || analyzing) return;
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const proxyUrl = `${API_BASE}/api/fetch-pdf?url=${encodeURIComponent(paper.pdfUrl)}`;
      const r = await fetch(proxyUrl);
      if (!r.ok) throw new Error('Could not fetch PDF');
      const text = await r.text();
      if (!text?.trim()) throw new Error('PDF text is empty');
      onAnalyze(text, paper.title);
    } catch (err: unknown) {
      setAnalyzeError(err instanceof Error ? err.message : 'Failed to fetch PDF');
      setAnalyzing(false);
    }
  };

  const authors = paper.authors.length > 3
    ? paper.authors.slice(0, 3).join(', ') + ' et al.'
    : paper.authors.join(', ');

  return (
    <div style={{
      background: '#fff', border: '1px solid #E0DFD8', borderRadius: 12,
      padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 10,
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      transition: 'box-shadow 0.18s, transform 0.18s',
      height: '100%', boxSizing: 'border-box',
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.09)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
        <SourceBadge source={paper.source} />
        <span style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'Inter, sans-serif' }}>
          {formatDate(paper.publishedDate)}
        </span>
      </div>

      {/* Title — clamped to 2 lines */}
      <h3 style={{
        fontFamily: '"Instrument Serif", Georgia, serif',
        fontSize: 16, fontWeight: 700, color: '#111111',
        lineHeight: 1.3, margin: 0,
        display: '-webkit-box', WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical', overflow: 'hidden',
      } as React.CSSProperties}>
        {paper.title}
      </h3>

      {/* Authors */}
      {authors && (
        <p style={{ fontSize: 12, color: '#6B7280', margin: 0, fontFamily: 'Inter, sans-serif', lineHeight: 1.4,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {authors}
        </p>
      )}

      {/* Abstract — always 3 lines, flex:1 pushes buttons to bottom */}
      <p style={{
        fontSize: 13, color: '#374151', margin: 0,
        fontFamily: 'Inter, sans-serif', lineHeight: 1.6,
        display: '-webkit-box', WebkitLineClamp: expanded ? undefined : 3,
        WebkitBoxOrient: 'vertical', overflow: expanded ? 'visible' : 'hidden',
        flex: 1,
      } as React.CSSProperties}>
        {paper.abstract || 'No abstract available.'}
      </p>

      {analyzeError && (
        <p style={{ fontSize: 11, color: '#DC2626', margin: 0, fontFamily: 'Inter, sans-serif' }}>{analyzeError}</p>
      )}

      {/* Buttons — always at bottom */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
        <button
          onClick={() => setExpanded(e => !e)}
          style={{
            background: 'none', border: '1px solid #E5E7EB', borderRadius: 999,
            padding: '7px 16px', fontSize: 12, fontWeight: 500,
            color: '#374151', fontFamily: 'Inter, inherit', cursor: 'pointer',
            transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#111'; e.currentTarget.style.color = '#111'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.color = '#374151'; }}
        >
          {expanded ? 'Collapse' : 'Read Abstract'}
        </button>

        <button
          onClick={handleAnalyze}
          disabled={!paper.pdfUrl || analyzing}
          title={!paper.pdfUrl ? 'PDF not freely available' : undefined}
          style={{
            background: !paper.pdfUrl ? '#E5E7EB' : '#111111',
            color: !paper.pdfUrl ? '#9CA3AF' : '#fff',
            border: 'none', borderRadius: 999,
            padding: '7px 16px', fontSize: 12, fontWeight: 600,
            fontFamily: 'Inter, inherit', cursor: !paper.pdfUrl ? 'not-allowed' : analyzing ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => { if (paper.pdfUrl && !analyzing) e.currentTarget.style.opacity = '0.85'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
        >
          {analyzing && (
            <span style={{
              width: 10, height: 10, border: '2px solid rgba(255,255,255,0.3)',
              borderTopColor: '#fff', borderRadius: '50%',
              animation: 'spin 0.7s linear infinite', flexShrink: 0, display: 'inline-block',
            }} />
          )}
          {analyzing ? 'Fetching PDF…' : 'Analyze with Learnova'}
        </button>
      </div>
    </div>
  );
}

// ─── Main ResearchFeed component ───────────────────────────────────────────────
const PAGE_LIMIT = 12;

export default function ResearchFeed({ onAnalyzePaper }: Props) {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Load papers — respects active category
  const loadPapers = useCallback(async (cat: string, page = 1, append = false) => {
    if (page === 1) {
      setLoading(true);
      setError(null);
    } else setLoadingMore(true);
    const catParam = cat !== 'All' ? `&category=${encodeURIComponent(cat)}` : '';
    try {
      const r = await fetch(`${API_BASE}/api/papers?page=${page}&limit=${PAGE_LIMIT}${catParam}`);
      const data = await r.json();
      if (data.papers && Array.isArray(data.papers)) {
        setPapers(prev => append ? [...prev, ...data.papers] : data.papers);
        setHasMore(data.hasMore ?? false);
        setCurrentPage(page);
      } else if (Array.isArray(data)) {
        setPapers(prev => append ? [...prev, ...data] : data);
        setHasMore(false);
      } else {
        if (!append) setError('Could not load papers right now. Try refreshing.');
      }
    } catch {
      if (!append) setError('Could not load papers right now. Try refreshing.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Initial load + reload when search clears
  useEffect(() => {
    if (searchQuery) return;
    loadPapers(activeCategory, 1, false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // Load more (respects active category)
  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    loadPapers(activeCategory, currentPage + 1, true);
  }, [loadingMore, hasMore, activeCategory, currentPage, loadPapers]);

  // Category change — server-side fetch
  const handleCategoryChange = useCallback((cat: string) => {
    setActiveCategory(cat);
    setSearchInput('');
    setSearchQuery('');
    loadPapers(cat, 1, false);
  }, [loadPapers]);

  // Search
  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchQuery(''); return; }
    setSearchQuery(q);
    setSearching(true);
    setError(null);
    try {
      const r = await fetch(`${API_BASE}/api/papers/search?q=${encodeURIComponent(q)}`);
      const data = await r.json();
      if (Array.isArray(data)) { setPapers(data); setActiveCategory('All'); }
      else setError('Search failed. Try a different query.');
    } catch {
      setError('Search failed. Try a different query.');
    } finally { setSearching(false); }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') doSearch(searchInput);
  };

  const clearSearch = () => { setSearchInput(''); setSearchQuery(''); handleCategoryChange('All'); };

  // All papers are already server-filtered — use them directly
  const filtered = papers;

  const handleAnalyzePaper = useCallback((text: string, title: string) => {
    onAnalyzePaper(text, title);
  }, [onAnalyzePaper]);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 80px' }}>

      {/* Section heading */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{
          fontFamily: '"Instrument Serif", Georgia, serif',
          fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 700,
          color: '#111', letterSpacing: '-0.015em', lineHeight: 1.2, marginBottom: 6,
        }}>
          Latest Research
        </h2>
        <p style={{ fontSize: 13, color: '#9CA3AF', fontFamily: 'Inter, sans-serif', lineHeight: 1.5, margin: 0 }}>
          Fresh papers from arXiv and Semantic Scholar — updated every 6 hours.
        </p>
      </div>

      {/* Search bar */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref={searchRef}
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search research papers…"
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '10px 40px 10px 38px',
            border: '1px solid #E5E7EB', borderRadius: 10,
            fontSize: 13, fontFamily: 'Inter, sans-serif', color: '#111',
            background: '#fff', outline: 'none',
            transition: 'border-color 0.15s',
          }}
          onFocus={e => (e.target.style.borderColor = '#4A6FA5')}
          onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
        />
        {searchInput && (
          <button onClick={clearSearch} style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 16, lineHeight: 1,
          }}>×</button>
        )}
      </div>

      {/* Category pills */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 20, scrollbarWidth: 'none' }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => handleCategoryChange(cat)}
            style={{
              flexShrink: 0,
              background: activeCategory === cat ? '#111111' : '#fff',
              color: activeCategory === cat ? '#fff' : '#374151',
              border: `1px solid ${activeCategory === cat ? '#111111' : '#E5E7EB'}`,
              borderRadius: 999, padding: '5px 14px',
              fontSize: 12, fontWeight: 500,
              fontFamily: 'Inter, sans-serif', cursor: 'pointer',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Search result label */}
      {searchQuery && !searching && (
        <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 16, fontFamily: 'Inter, sans-serif' }}>
          {filtered.length} results for <strong>"{searchQuery}"</strong>
          <button onClick={clearSearch} style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#4A6FA5', fontSize: 12, fontFamily: 'inherit', padding: 0 }}>Clear</button>
        </div>
      )}

      {/* Error */}
      {error && (
        <p style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', padding: '24px 0', fontFamily: 'Inter, sans-serif' }}>
          {error}
        </p>
      )}

      {/* Loading skeletons */}
      {(loading || searching) && !error && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Empty state */}
      {!loading && !searching && !error && filtered.length === 0 && (
        <p style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', padding: '48px 0', fontFamily: 'Inter, sans-serif' }}>
          No papers found. Try a different search or category.
        </p>
      )}

      {/* Paper grid — animated on category switch */}
      {!loading && !searching && !error && filtered.length > 0 && (
        <>
          <div
            style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16,
            }}
          >
            {filtered.map((paper, i) => (
              <div
                key={paper.id}
                style={{
                  animation: `cardIn 0.3s cubic-bezier(0.22,1,0.36,1) both`,
                  animationDelay: `${i * 28}ms`,
                  height: '100%',
                }}
              >
                <PaperCard paper={paper} onAnalyze={handleAnalyzePaper} />
              </div>
            ))}
          </div>

          {/* Load more — works for every category */}
          {!searchQuery && hasMore && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 36 }}>
              <button
                onClick={loadMore}
                disabled={loadingMore}
                style={{
                  background: '#fff', border: '1px solid #E0DFD8',
                  borderRadius: '999px', padding: '10px 32px',
                  fontSize: 13, fontWeight: 600, fontFamily: 'Inter, sans-serif',
                  color: loadingMore ? '#9CA3AF' : '#374151',
                  cursor: loadingMore ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (!loadingMore) { e.currentTarget.style.borderColor = '#111'; e.currentTarget.style.color = '#111'; } }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#E0DFD8'; e.currentTarget.style.color = '#374151'; }}
              >
                {loadingMore && (
                  <span style={{
                    width: 12, height: 12,
                    border: '2px solid #E0DFD8', borderTopColor: '#555',
                    borderRadius: '50%', animation: 'spin 0.7s linear infinite',
                    display: 'inline-block',
                  }} />
                )}
                {loadingMore ? 'Loading…' : `Load more ${activeCategory === 'All' ? 'papers' : activeCategory + ' papers'}`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
