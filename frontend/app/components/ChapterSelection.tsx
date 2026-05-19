'use client';

import { useEffect, useState } from 'react';
import { API_BASE } from '../lib/api';

export type Chapter = { num: number; title: string; startPage: number; endPage: number };
export type ChapterMode = 'analyze' | 'quiz';

type Props = {
  bookTitle: string;
  pageCount: number;
  pagesText: string[];
  onVisualize: (chapters: Chapter[], pagesText: string[], mode: ChapterMode) => void;
};

// ─── Fallback: client-side regex detection ─────────────────────────────────────
function detectChaptersFallback(pagesText: string[], totalPages: number): Chapter[] {
  const tocPatterns = [
    /^chapter\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b[\.\s:—-]*(.+?)[\s.]+(\\d+)\s*$/i,
    /^(\d+)\.\s+(.+?)[\s.]{2,}(\d+)\s*$/,
    /^(CHAPTER\s+[A-Z\s]+?)\s{2,}(\d+)\s*$/,
    /^(.{5,50}?)[\s.]{3,}(\d+)\s*$/,
  ];

  interface TocEntry { title: string; page: number }
  let tocEntries: TocEntry[] = [];
  let foundToc = false;

  const scanPages = Math.min(50, pagesText.length);
  for (let p = 0; p < scanPages; p++) {
    const pageText = pagesText[p];
    const lowerPage = pageText.toLowerCase();
    if (!foundToc && (lowerPage.includes('contents') || lowerPage.includes('table of contents') || lowerPage.includes('index'))) {
      foundToc = true;
    }
    if (!foundToc) continue;

    const lines = pageText.split('\n').map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      for (const pattern of tocPatterns) {
        const m = line.match(pattern);
        if (m) {
          let title = '', pageNum = 0;
          if (pattern === tocPatterns[0]) { title = m[2]?.trim() || ''; pageNum = parseInt(m[3] || '0'); }
          else if (pattern === tocPatterns[1]) { title = m[2]?.trim() || ''; pageNum = parseInt(m[3] || '0'); }
          else if (pattern === tocPatterns[2]) { title = m[1]?.trim() || ''; pageNum = parseInt(m[2] || '0'); }
          else { title = m[1]?.trim() || ''; pageNum = parseInt(m[2] || '0'); }

          if (pageNum > 0 && pageNum <= totalPages && title.length > 2 && title.length < 80) {
            tocEntries.push({ title, page: pageNum });
          }
          break;
        }
      }
    }
  }

  const seen = new Set<string>();
  tocEntries = tocEntries.filter(e => {
    const key = `${e.title}|${e.page}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => a.page - b.page);

  if (tocEntries.length >= 2) {
    return tocEntries.map((entry, i) => ({
      num: i + 1,
      title: entry.title,
      startPage: entry.page,
      endPage: i + 1 < tocEntries.length ? tocEntries[i + 1].page - 1 : totalPages,
    }));
  }

  // Last resort: 30-page chunks
  const chapters: Chapter[] = [];
  const chunkSize = 30;
  for (let start = 1; start <= totalPages; start += chunkSize) {
    const end = Math.min(start + chunkSize - 1, totalPages);
    chapters.push({ num: chapters.length + 1, title: `Part ${chapters.length + 1}`, startPage: start, endPage: end });
  }
  return chapters;
}

// ─── Mode selection cards ──────────────────────────────────────────────────────
function ModeSelectionCards({
  chapter,
  onSelect,
  onBack,
}: {
  chapter: Chapter;
  onSelect: (mode: ChapterMode) => void;
  onBack: () => void;
}) {
  const [hoveredCard, setHoveredCard] = useState<ChapterMode | null>(null);

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '40px 24px 100px' }}>
      <button
        onClick={onBack}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'inherit',
          marginBottom: '28px', padding: '4px 0',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = '#111')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to chapters
      </button>

      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '6px' }}>
          Chapter {chapter.num}
        </div>
        <h2 style={{
          fontFamily: '"Instrument Serif", Georgia, serif',
          fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 700,
          color: '#111', lineHeight: 1.2, letterSpacing: '-0.015em',
          marginBottom: '6px',
        }}>
          {chapter.title}
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Pages {chapter.startPage}–{chapter.endPage}</p>
      </div>

      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', fontWeight: 500 }}>
        What would you like to do with this chapter?
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Analyze card */}
        <div
          onClick={() => onSelect('analyze')}
          onMouseEnter={() => setHoveredCard('analyze')}
          onMouseLeave={() => setHoveredCard(null)}
          style={{
            background: hoveredCard === 'analyze' ? '#FFF4EF' : '#fff',
            border: `2px solid ${hoveredCard === 'analyze' ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: '16px',
            padding: '28px 24px',
            cursor: 'pointer',
            transition: 'all 0.18s ease',
            textAlign: 'center',
            boxShadow: hoveredCard === 'analyze' ? '0 8px 24px rgba(232,87,42,0.12)' : '0 1px 4px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{
            width: '52px', height: '52px', borderRadius: '14px', margin: '0 auto 16px',
            background: hoveredCard === 'analyze' ? '#FDEEE8' : '#F0FDF4',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.18s',
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
              stroke={hoveredCard === 'analyze' ? 'var(--accent)' : '#059669'}
              strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
              <circle cx="12" cy="12" r="10" />
            </svg>
          </div>
          <div style={{
            fontSize: '16px', fontWeight: 700,
            color: hoveredCard === 'analyze' ? 'var(--accent)' : '#111',
            marginBottom: '10px', transition: 'color 0.18s',
          }}>
            Analyze Chapter
          </div>
          <div style={{
            fontSize: '13px', lineHeight: 1.6,
            color: hoveredCard === 'analyze' ? 'var(--text-secondary)' : 'var(--text-secondary)',
            transition: 'color 0.18s',
          }}>
            Get a detailed visual explanation with diagrams, charts, and concept breakdowns.
          </div>
        </div>

        {/* Quiz card */}
        <div
          onClick={() => onSelect('quiz')}
          onMouseEnter={() => setHoveredCard('quiz')}
          onMouseLeave={() => setHoveredCard(null)}
          style={{
            background: hoveredCard === 'quiz' ? '#FFF4EF' : '#fff',
            border: `2px solid ${hoveredCard === 'quiz' ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: '16px',
            padding: '28px 24px',
            cursor: 'pointer',
            transition: 'all 0.18s ease',
            textAlign: 'center',
            boxShadow: hoveredCard === 'quiz' ? '0 8px 24px rgba(232,87,42,0.12)' : '0 1px 4px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{
            width: '52px', height: '52px', borderRadius: '14px', margin: '0 auto 16px',
            background: hoveredCard === 'quiz' ? '#FDEEE8' : '#FEF3C7',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.18s',
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
              stroke={hoveredCard === 'quiz' ? 'var(--accent)' : '#D97706'}
              strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <div style={{
            fontSize: '16px', fontWeight: 700,
            color: hoveredCard === 'quiz' ? 'var(--accent)' : '#111',
            marginBottom: '10px', transition: 'color 0.18s',
          }}>
            Take a Quiz
          </div>
          <div style={{
            fontSize: '13px', lineHeight: 1.6,
            color: hoveredCard === 'quiz' ? 'var(--text-secondary)' : 'var(--text-secondary)',
            transition: 'color 0.18s',
          }}>
            Test your understanding with up to 30 MCQ questions from this chapter.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ChapterSelection({ bookTitle, pageCount, pagesText, onVisualize }: Props) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [detecting, setDetecting] = useState(true);
  const [showModeSelect, setShowModeSelect] = useState(false);

  useEffect(() => {
    setDetecting(true);
    setSelected(null);
    setShowModeSelect(false);

    // Use Gemini API to extract table of contents
    const detectWithGemini = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/detect-chapters`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pagesText, totalPages: pageCount }),
        });
        const data = await res.json();

        if (res.ok && Array.isArray(data.chapters) && data.chapters.length >= 2) {
          // Build chapters with endPage from AI response
          const aiChapters = data.chapters as { number: number; name: string; startPage: number }[];
          const built: Chapter[] = aiChapters
            .filter(c => c.name && c.startPage > 0)
            .sort((a, b) => a.startPage - b.startPage)
            .map((c, i, arr) => ({
              num: c.number || i + 1,
              title: c.name,
              startPage: c.startPage,
              endPage: i + 1 < arr.length ? arr[i + 1].startPage - 1 : pageCount,
            }));
          if (built.length >= 2) {
            setChapters(built);
            setDetecting(false);
            return;
          }
        }
        // Fallback to client-side regex
        setChapters(detectChaptersFallback(pagesText, pageCount));
      } catch {
        setChapters(detectChaptersFallback(pagesText, pageCount));
      }
      setDetecting(false);
    };

    detectWithGemini();
  }, [pagesText, pageCount]);

  const selectedChapter = chapters.find(c => c.num === selected);

  const handleContinue = () => {
    if (selected === null) return;
    setShowModeSelect(true);
  };

  const handleModeSelect = (mode: ChapterMode) => {
    if (!selectedChapter) return;
    onVisualize([selectedChapter], pagesText, mode);
  };

  // Show mode selection cards
  if (showModeSelect && selectedChapter) {
    return (
      <ModeSelectionCards
        chapter={selectedChapter}
        onSelect={handleModeSelect}
        onBack={() => setShowModeSelect(false)}
      />
    );
  }

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '40px 24px 100px' }}>

      {/* Book title */}
      <div style={{ marginBottom: '6px' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '8px' }}>
          Book
        </div>
        <h1 style={{
          fontFamily: '"Instrument Serif", Georgia, serif',
          fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 700,
          color: '#111', lineHeight: 1.2, letterSpacing: '-0.015em',
        }}>
          {bookTitle.replace(/\.pdf$/i, '')}
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>
          {pageCount} pages detected
        </p>
      </div>

      <div style={{ width: '40px', height: '2px', background: 'var(--accent)', margin: '20px 0 28px', borderRadius: '1px' }} />

      {/* Chapter list */}
      {detecting ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: 'var(--text-muted)', fontSize: '14px', padding: '40px 0' }}>
          <span className="spinner spinner-dark" style={{ width: '20px', height: '20px', borderWidth: '2px' }} />
          <span>Detecting chapters with AI…</span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', opacity: 0.7 }}>Reading table of contents</span>
        </div>
      ) : (
        <>
          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '12px' }}>
            {chapters.length} chapter{chapters.length !== 1 ? 's' : ''} found — click one to begin
          </div>

          <div style={{ border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', background: '#fff' }}>
            {(() => {
              const maxPages = Math.max(...chapters.map(c => c.endPage - c.startPage + 1), 1);
              return chapters.map((ch, idx) => {
                const isSelected = selected === ch.num;
                const pageCount = ch.endPage - ch.startPage + 1;
                const barPct = Math.max(4, Math.round((pageCount / maxPages) * 100));
                return (
                  <div
                    key={ch.num}
                    onClick={() => { setSelected(ch.num); setShowModeSelect(true); }}
                    style={{
                      padding: '12px 20px 10px',
                      borderBottom: idx < chapters.length - 1 ? '1px solid var(--border)' : 'none',
                      cursor: 'pointer',
                      background: isSelected ? '#f0fdf4' : 'transparent',
                      borderLeft: isSelected ? '3px solid #059669' : '3px solid transparent',
                      transition: 'all 0.12s ease',
                    }}
                    onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-muted)'; }}
                    onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                  >
                    {/* Top row: number + title + check */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: 8 }}>
                      <div style={{
                        width: '28px', height: '28px', flexShrink: 0, borderRadius: '7px',
                        background: isSelected ? '#d1fae5' : 'var(--bg-muted)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '11px', fontWeight: 700,
                        color: isSelected ? '#059669' : 'var(--text-muted)',
                        transition: 'all 0.12s',
                      }}>
                        {ch.num}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '13px', fontWeight: 600,
                          color: isSelected ? '#065f46' : 'var(--text-primary)',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {ch.title}
                        </div>
                      </div>
                      {isSelected && (
                        <div style={{ flexShrink: 0, color: '#059669' }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Bar chart row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 40 }}>
                      <div style={{ flex: 1, height: 4, background: '#EBEBEB', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{
                          width: `${barPct}%`, height: '100%',
                          background: isSelected ? '#059669' : '#C8C8C5',
                          borderRadius: 3,
                          transition: 'width 0.4s ease',
                        }} />
                      </div>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', flexShrink: 0, minWidth: 70 }}>
                        p. {ch.startPage}–{ch.endPage} · {pageCount} pp
                      </span>
                    </div>
                  </div>
                );
              });
            })()}
          </div>

        </>
      )}
    </div>
  );
}
