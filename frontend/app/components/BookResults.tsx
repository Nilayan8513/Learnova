'use client';

import { useState } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import type { ChapterMode } from './ChapterSelection';
import { API_BASE } from '../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────
export type BookConcept = { id: string; label: string; explanation: string; difficulty: 'Basic' | 'Intermediate' | 'Advanced' };
export type BookMCQ = { question: string; options: string[]; correct: number; explanation: string };
export type SectionVisualization = {
  type: 'bar' | 'line' | 'flow' | 'comparison_table' | 'pie' | 'timeline';
  title: string; caption: string;
  data?: { labels?: string[]; values?: number[]; steps?: string[]; headers?: string[]; rows?: string[][]; events?: { year: string; label: string }[] };
};
export type BookSection = { title: string; content: string; visualization: SectionVisualization; key_insight: string };
export type ChapterResult = {
  chapterNum: number; chapterTitle: string;
  chapter_title?: string; simple_summary?: string;
  sections?: BookSection[]; concepts?: BookConcept[]; mcqs?: BookMCQ[];
  failed?: boolean; failMessage?: string;
  hasMore?: boolean; nextOffset?: number;
  rawText?: string;
};

type Props = { results: ChapterResult[]; chapterMode: ChapterMode; onReset: () => void; onBackToChapters: () => void };

// ─── Muted, site-aligned palette (warm greys, one accent) ───────────────────────
// Academic palette — single blue for charts, muted pies
const ACADEMIC_BLUE = '#4A6FA5';
const PIE_COLORS = ['#4A6FA5', '#6B8FC4', '#8FADD4', '#B4C9E3', '#D9E4F0'];

const diffColors: Record<string, { bg: string; color: string }> = {
  Basic:        { bg: '#F3F5F0', color: '#4A7A55' },
  Intermediate: { bg: '#FBF8F5', color: '#8B6A3E' },
  Advanced:     { bg: '#FFF8F5', color: '#C04A22' },
};

const VIZ_META: Record<string, { icon: string; label: string; color: string }> = {
  bar:              { icon: '▌', label: 'Bar Chart',    color: '#9B9B95' },
  line:             { icon: '↗', label: 'Trend Chart',  color: '#9B9B95' },
  pie:              { icon: '◔', label: 'Pie Chart',    color: '#9B9B95' },
  flow:             { icon: '▶', label: 'Process Flow', color: '#9B9B95' },
  comparison_table: { icon: '⊞', label: 'Comparison',  color: '#9B9B95' },
  timeline:         { icon: '◎', label: 'Timeline',    color: '#9B9B95' },
};

// ─── Small compact visualizations ─────────────────────────────────────────────
function CompactViz({ viz }: { viz: SectionVisualization }) {
  if (!viz || !viz.type) return null;
  const { type, title, caption, data } = viz;
  const meta = VIZ_META[type] || { icon: '📊', label: 'Chart', color: '#4A90D9' };

  const wrap = (children: React.ReactNode) => (
    <div style={{ marginTop: 14 }}>
      {title && <p style={{ fontSize: 13, fontWeight: 700, color: '#111111', margin: '0 0 8px', lineHeight: 1.4, fontFamily: 'Inter, sans-serif' }}>{title}</p>}
      <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '14px 14px 10px' }}>{children}</div>
      </div>
      {caption && (
        <p style={{ margin: '6px 0 0', fontSize: 11, color: '#6B7280', lineHeight: 1.6, fontStyle: 'italic', fontFamily: 'Inter, sans-serif' }}>{caption}</p>
      )}
    </div>
  );

  try {
    if (type === 'bar' && data?.labels && data?.values) {
      const chartData = data.labels.map((l, i) => ({ name: l, value: data.values![i] ?? 0 }));
      const needsAngle = chartData.length > 4 || Math.max(...chartData.map(d => d.name.length)) > 9;
      const bottomMargin = needsAngle ? 60 : 36;
      return wrap(
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 20, right: 16, left: 8, bottom: bottomMargin }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: '#6B7280', fontFamily: 'Inter' }}
              axisLine={{ stroke: '#E5E7EB' }} tickLine={false}
              angle={needsAngle ? -35 : 0}
              textAnchor={needsAngle ? 'end' : 'middle'}
              height={needsAngle ? 56 : 28}
              interval={0}
            />
            <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} width={36} />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 4, border: '1px solid #E5E7EB', fontFamily: 'Inter' }} />
            <Bar dataKey="value" radius={[3, 3, 0, 0]} maxBarSize={40} fill={ACADEMIC_BLUE}>
              {chartData.map((_, i) => <Cell key={i} fill={ACADEMIC_BLUE} />)}
              <LabelList dataKey="value" position="top" style={{ fontSize: 10, fontWeight: 600, fill: '#6B7280', fontFamily: 'Inter' }}
                formatter={(v: number) => v > 999 ? v.toLocaleString() : v} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (type === 'line' && data?.labels && data?.values) {
      const chartData = data.labels.map((l, i) => ({ name: l, value: data.values![i] ?? 0 }));
      const needsAngle = chartData.length > 5;
      const bottomMargin = needsAngle ? 52 : 36;
      return wrap(
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: bottomMargin }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: '#9CA3AF', fontFamily: 'Inter' }}
              axisLine={{ stroke: '#E5E7EB' }} tickLine={false}
              angle={needsAngle ? -30 : 0}
              textAnchor={needsAngle ? 'end' : 'middle'}
              height={needsAngle ? 48 : 28}
            />
            <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} width={36} />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 4, border: '1px solid #E5E7EB', fontFamily: 'Inter' }} />
            <Legend
              wrapperStyle={{ fontSize: 10, color: '#6B7280', paddingTop: 4, fontFamily: 'Inter' }}
              verticalAlign="top"
              align="center"
            />
            <Line type="monotone" dataKey="value" name={title || 'Value'} stroke={ACADEMIC_BLUE} strokeWidth={2}
              dot={{ r: 4, fill: ACADEMIC_BLUE, stroke: '#fff', strokeWidth: 1.5 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (type === 'pie' && data?.labels && data?.values) {
      const chartData = data.labels.map((l, i) => ({ name: l, value: data.values![i] ?? 0 }));
      return wrap(
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <ResponsiveContainer width={130} height={130}>
            <PieChart>
              <Pie data={chartData} cx="50%" cy="50%" outerRadius={56} innerRadius={20} dataKey="value" paddingAngle={1}>
                {chartData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 4, border: '1px solid #E5E7EB', fontFamily: 'Inter' }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {chartData.map((d, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: '#374151', fontFamily: 'Inter' }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                <span style={{ fontWeight: 500 }}>{d.name}</span>
                <span style={{ color: '#9CA3AF' }}>{d.value}%</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (type === 'flow' && data?.steps) {
      const rawSteps = data.steps as string[];
      const allSteps = rawSteps.length >= 2 ? rawSteps : rawSteps.length === 1
        ? [rawSteps[0], 'Complete'] : ['Start', 'Process', 'Complete'];
      // Wrap into rows of 4 max
      const ROW = 4;
      const rows: string[][] = [];
      for (let i = 0; i < allSteps.length; i += ROW) rows.push(allSteps.slice(i, i + ROW));
      return wrap(
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rows.map((rowSteps, ri) => (
            <div key={ri} style={{ display: 'flex', flexWrap: 'nowrap', alignItems: 'center', justifyContent: 'center', gap: 0 }}>
              {rowSteps.map((s, i) => {
                const absIdx = ri * ROW + i;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                    <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 4,
                      padding: '8px 12px', minWidth: 84, maxWidth: 130, textAlign: 'center', flexShrink: 0 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9CA3AF', marginBottom: 4 }}>
                        STEP {absIdx + 1}
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#111111', lineHeight: 1.3, wordBreak: 'break-word' }}>{s}</div>
                    </div>
                    {i < rowSteps.length - 1 && <span style={{ color: '#9CA3AF', fontSize: 14, margin: '0 4px', flexShrink: 0 }}>→</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      );
    }

    if (type === 'comparison_table' && data?.headers && data?.rows) {
      return wrap(
        <div style={{ overflowX: 'auto', border: '1px solid #E5E7EB', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'Inter, sans-serif' }}>
            <thead>
              <tr style={{ background: '#F3F4F6' }}>{(data.headers as string[]).map((h, i) => (
                <th key={i} style={{ padding: '8px 12px', textAlign: i === 0 ? 'left' : 'right',
                  fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em',
                  color: '#111111', borderBottom: '1px solid #E5E7EB',
                  borderRight: i < (data.headers as string[]).length - 1 ? '1px solid #E5E7EB' : 'none',
                  whiteSpace: 'nowrap' }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>{(data.rows as string[][]).map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}>
                {row.map((cell, j) => (
                  <td key={j} style={{ padding: '8px 12px', textAlign: j === 0 ? 'left' : 'right',
                    borderBottom: '1px solid #E5E7EB',
                    borderRight: j < row.length - 1 ? '1px solid #E5E7EB' : 'none',
                    color: '#374151', fontWeight: j === 0 ? 600 : 400 }}>{cell}</td>
                ))}
              </tr>
            ))}</tbody>
          </table>
        </div>
      );
    }

    if (type === 'timeline' && data?.events) {
      const events = (data.events as { year: string; label: string }[]).slice(0, 6);
      return wrap(
        <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', minWidth: events.length * 100, position: 'relative' }}>
            {/* connecting line */}
            <div style={{ position: 'absolute', top: 26, left: 12, right: 12, height: 1, background: '#E5E7EB', zIndex: 0 }} />
            {events.map((ev, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, position: 'relative', zIndex: 1 }}>
                <div style={{ fontSize: 10, color: '#6B7280', textAlign: 'center', marginBottom: 6, lineHeight: 1.3, maxWidth: 85, padding: '0 4px', fontFamily: 'Inter' }}>{ev.label}</div>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: ACADEMIC_BLUE, border: '2px solid #fff', boxShadow: `0 0 0 1.5px ${ACADEMIC_BLUE}` }} />
                <div style={{ fontSize: 10, fontWeight: 700, color: '#111111', marginTop: 5, fontFamily: 'Inter' }}>{ev.year}</div>
              </div>
            ))}
          </div>
        </div>
      );
    }
  } catch { return null; }
  return null;
}

// ─── Concept row with Learn More ──────────────────────────────────────────────
function ConceptRow({ concept: c, isLast }: { concept: BookConcept; isLast: boolean }) {
  const [open, setOpen] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const dc = diffColors[c.difficulty] || { bg: '#F3F4F6', color: '#374151' };

  const handleToggle = async () => {
    const next = !open;
    setOpen(next);
    // Fetch AI explanation only once, on first open
    if (next && aiExplanation === null && !loading) {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/explain-simpler`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conceptName: c.label }),
        });
        const data = await res.json();
        setAiExplanation(data.explanation || c.explanation);
      } catch {
        setAiExplanation(c.explanation);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div style={{ borderBottom: isLast ? 'none' : '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 18px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{c.label}</span>
            <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', background: dc.bg, color: dc.color, borderRadius: 4, padding: '2px 6px' }}>{c.difficulty}</span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{c.explanation}</p>
          {open && (
            <div className="expand-content" style={{ marginTop: 10, padding: '12px 14px', background: 'var(--bg-muted)', borderRadius: 8, borderLeft: `3px solid ${dc.color}` }}>
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="spinner spinner-dark" style={{ width: 13, height: 13, borderWidth: '1.5px' }} />
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Getting a simpler explanation…</span>
                </div>
              ) : (
                <>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: dc.color, marginBottom: 6 }}>
                    Simpler explanation
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--text-body)', lineHeight: 1.75, margin: 0 }}>
                    {aiExplanation}
                  </p>
                </>
              )}
            </div>
          )}
        </div>
        <button
          onClick={handleToggle}
          style={{
            flexShrink: 0,
            background: open ? dc.bg : 'var(--bg-muted)',
            border: `1px solid ${open ? dc.color : 'var(--border)'}`,
            borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 600,
            color: open ? dc.color : 'var(--text-secondary)',
            cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
            whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2,
          }}
        >
          {open ? 'Close' : 'Learn more'}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Analyze View ─────────────────────────────────────────────────────────────
function AnalyzeView({ result, onBackToChapters, onReset }: { result: ChapterResult; onBackToChapters: () => void; onReset: () => void }) {
  const title = result.chapter_title || result.chapterTitle;
  const [extraSections, setExtraSections] = useState<BookSection[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [currentHasMore, setCurrentHasMore] = useState(result.hasMore ?? false);
  const [currentOffset, setCurrentOffset] = useState(result.nextOffset ?? 30000);

  const allSections = [...(result.sections || []), ...extraSections];
  const concepts = result.concepts || [];

  const loadMore = async () => {
    if (!result.rawText || loadingMore) return;
    setAnalyzeError(null);
    setLoadingMore(true);
    try {
      const res = await fetch(`${API_BASE}/api/analyze-chapter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: result.rawText,
          chapterTitle: result.chapterTitle,
          offset: currentOffset,
        }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.sections)) {
        setExtraSections(prev => [...prev, ...data.sections]);
        setCurrentHasMore(data.hasMore ?? false);
        setCurrentOffset(data.nextOffset ?? currentOffset + 30000);
      } else {
        throw new Error(data.error || 'Failed to load more sections.');
      }
    } catch (e) {
      console.error('Load more failed:', e);
      setAnalyzeError(e instanceof Error ? e.message : 'Failed to load more topics. The AI service may be temporarily unavailable.');
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 24px 100px' }}>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '8px' }}>Chapter {result.chapterNum}</div>
        <h1 style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 700, color: '#111', lineHeight: 1.2, letterSpacing: '-0.015em' }}>{title}</h1>
      </div>

      {result.simple_summary && (
        <p style={{ fontSize: '15px', lineHeight: 1.8, color: '#555', maxWidth: '640px', marginBottom: '32px', padding: '16px 20px', background: '#fff', border: '1px solid var(--border)', borderRadius: 12 }}>{result.simple_summary}</p>
      )}

      {allSections.map((sec, i) => (
        <div key={i} style={{ marginBottom: '32px', paddingBottom: '32px', borderBottom: i < allSections.length - 1 ? '1px solid #EBEBEB' : 'none' }}>
          <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#111', marginBottom: '8px' }}>{sec.title}</h2>
          <p style={{ fontSize: '14px', color: '#555', lineHeight: 1.7, marginBottom: '4px' }}>{sec.content}</p>
          {sec.visualization && <CompactViz viz={sec.visualization} />}
          {sec.key_insight && (
            <div style={{ marginTop: 10, padding: '11px 14px', background: '#F0F5FF', border: '1px solid #D1DFFE', borderRadius: 8 }}>
              <p style={{ fontSize: 12, color: '#374151', lineHeight: 1.6, margin: 0, fontFamily: 'Inter, sans-serif' }}>{sec.key_insight}</p>
            </div>
          )}
        </div>
      ))}

      {analyzeError && (
        <div className="error-card" style={{ margin: '0 0 20px' }}>
          <p>⚠️ {analyzeError}</p>
          <button id="retry-analyze-btn" onClick={loadMore}>Retry</button>
        </div>
      )}

      {currentHasMore && result.rawText && (
        <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0 36px' }}>
          <button
            onClick={loadMore}
            disabled={loadingMore}
            style={{
              background: loadingMore ? '#E0DFD8' : '#1A1A19',
              color: loadingMore ? '#9B9B95' : '#fff',
              border: 'none', borderRadius: 999,
              padding: '9px 22px', fontSize: 13, fontWeight: 500,
              fontFamily: 'inherit', cursor: loadingMore ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 7,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { if (!loadingMore) e.currentTarget.style.background = '#333'; }}
            onMouseLeave={e => { if (!loadingMore) e.currentTarget.style.background = '#1A1A19'; }}
          >
            {loadingMore ? (
              <><div className="spinner spinner-dark" style={{ width: 12, height: 12 }} />Analyzing…</>
            ) : (
              <>Load more topics</>
            )}
          </button>
        </div>
      )}


      {concepts.length > 0 && (
        <>
          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '14px', marginTop: '8px' }}>Key Concepts</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
            {concepts.map(c => {
              const dc = diffColors[c.difficulty] || { bg: '#F3F4F6', color: '#374151' };
              return (
                <div key={c.id} style={{ background: dc.bg, borderRadius: 999, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: dc.color }}>{c.label}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: dc.color, opacity: 0.7 }}>{c.difficulty}</span>
                </div>
              );
            })}
          </div>
          <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
            {concepts.map((c, i) => <ConceptRow key={c.id} concept={c} isLast={i === concepts.length - 1} />)}
          </div>
        </>
      )}

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 48 }}>
        <button onClick={onBackToChapters} style={{ background: '#111111', color: '#fff', border: 'none', borderRadius: 999, padding: '11px 26px', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, transition: 'opacity 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')} onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          Back to chapters
        </button>
        <button onClick={onReset} className="btn-ghost" style={{ fontSize: 13, padding: '9px 18px' }}>Home</button>
      </div>
    </div>
  );
}

// ─── Quiz View ─────────────────────────────────────────────────────────────────
function QuizView({ result, onBackToChapters, onReset }: { result: ChapterResult; onBackToChapters: () => void; onReset: () => void }) {
  const mcqs = result.mcqs || [];
  const [current, setCurrent] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>(mcqs.map(() => null));
  const [finished, setFinished] = useState(false);

  const title = result.chapter_title || result.chapterTitle;
  const q = mcqs[current];
  const score = answers.filter((a, i) => a === mcqs[i]?.correct).length;
  const pct = mcqs.length > 0 ? Math.round((score / mcqs.length) * 100) : 0;

  const pick = (oi: number) => {
    if (chosen !== null) return;
    setChosen(oi);
    const next = [...answers];
    next[current] = oi;
    setAnswers(next);
  };

  const nextQ = () => {
    if (current < mcqs.length - 1) { setCurrent(current + 1); setChosen(answers[current + 1]); }
    else setFinished(true);
  };

  if (mcqs.length === 0) return (
    <div style={{ maxWidth: 600, margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
      <p style={{ color: '#888' }}>No quiz questions available.</p>
      <button onClick={onBackToChapters} style={{ marginTop: 20, background: '#111111', color: '#fff', border: 'none', borderRadius: 999, padding: '11px 26px', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>Back to chapters</button>
    </div>
  );

  if (finished) {
    const msg = pct >= 80 ? 'Excellent understanding! 🎉' : pct >= 60 ? 'Good job, keep going! 👍' : 'Review this chapter again 📖';
    const bg = pct >= 80 ? '#D1FAE5' : pct >= 60 ? '#FEF3C7' : '#FEE2E2';
    const border = pct >= 80 ? '#059669' : pct >= 60 ? '#D97706' : '#DC2626';
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '60px 24px 100px', textAlign: 'center' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 8 }}>Quiz Complete</div>
        <h1 style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontSize: 32, fontWeight: 700, color: '#111', marginBottom: 24 }}>{title}</h1>
        <div style={{ background: bg, border: `2px solid ${border}`, borderRadius: 16, padding: '32px 24px', marginBottom: 28 }}>
          <div style={{ fontSize: 56, fontWeight: 800, color: '#111', lineHeight: 1 }}>{score}<span style={{ fontSize: 28, color: '#555' }}>/{mcqs.length}</span></div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#111', marginTop: 8 }}>{pct}%</div>
          <div style={{ fontSize: 16, color: '#444', marginTop: 8 }}>{msg}</div>
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => { setCurrent(0); setChosen(answers[0]); setFinished(false); }} style={{ background: '#111111', color: '#fff', border: 'none', borderRadius: 999, padding: '11px 26px', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', transition: 'opacity 0.15s' }} onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')} onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>Review Answers</button>
          <button onClick={onBackToChapters} className="btn-ghost" style={{ fontSize: 13, padding: '9px 18px' }}>Back to chapters</button>
          <button onClick={onReset} className="btn-ghost" style={{ fontSize: 13, padding: '9px 18px' }}>Home</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 620, margin: '0 auto', padding: '40px 24px 100px' }}>
      <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 6 }}>Quiz · {title}</div>

      {/* Progress bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <div style={{ flex: 1, height: 6, background: '#E8E8E4', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${((current + 1) / mcqs.length) * 100}%`, background: 'linear-gradient(90deg,#059669,#10b981)', borderRadius: 3, transition: 'width 0.3s ease' }} />
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', fontWeight: 600 }}>Question {current + 1} of {mcqs.length}</span>
      </div>

      {/* Question */}
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, padding: '24px 24px 20px', marginBottom: 20 }}>
        <p style={{ fontSize: 17, fontWeight: 600, color: '#111', lineHeight: 1.6, margin: 0 }}>{q.question}</p>
      </div>

      {/* Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {q.options.map((opt, oi) => {
          const isCorrect = oi === q.correct;
          const isChosen = chosen === oi;
          let bg = '#fff', border = 'var(--border)', color = 'var(--text-primary)';
          if (chosen !== null) {
            if (isCorrect) { bg = '#D1FAE5'; border = '#059669'; color = '#065F46'; }
            else if (isChosen) { bg = '#FEE2E2'; border = '#DC2626'; color = '#7F1D1D'; }
          }
          return (
            <button key={oi} onClick={() => pick(oi)} style={{ background: bg, border: `1.5px solid ${border}`, borderRadius: 10, padding: '12px 16px', fontSize: 14, color, textAlign: 'left', fontFamily: 'inherit', cursor: chosen === null ? 'pointer' : 'default', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontWeight: 700, opacity: 0.5, minWidth: 20 }}>{String.fromCharCode(65 + oi)}.</span>
              <span style={{ flex: 1 }}>{opt}</span>
              {chosen !== null && isCorrect && <span>✓</span>}
              {chosen !== null && isChosen && !isCorrect && <span>✗</span>}
            </button>
          );
        })}
      </div>

      {/* Explanation */}
      {chosen !== null && q.explanation && (
        <div style={{ background: '#F8F8F5', border: '1px solid #E0E0DC', borderRadius: 10, padding: '12px 16px', marginBottom: 20, borderLeft: '3px solid #059669' }}>
          <p style={{ fontSize: 13, color: '#555', lineHeight: 1.6, margin: 0 }}>{q.explanation}</p>
        </div>
      )}

      {/* Next button */}
      {chosen !== null && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={nextQ} style={{ background: '#111', color: '#fff', border: 'none', borderRadius: 999, padding: '12px 28px', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', transition: 'opacity 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')} onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
            {current < mcqs.length - 1 ? 'Next Question →' : 'See Results'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function BookResults({ results, chapterMode, onReset, onBackToChapters }: Props) {
  const result = results[0];
  if (!result) return null;

  if (result.failed) {
    const isQuiz = chapterMode === 'quiz';
    return (
      <div style={{ maxWidth: '600px', margin: '80px auto', padding: '0 24px' }}>
        <div className="error-card" style={{ flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left', gap: 16 }}>
          <div>
            <p style={{ fontWeight: 700, marginBottom: 6 }}>
              ⚠️ {isQuiz ? 'Failed to load quiz.' : 'Analysis failed.'} The AI service may be temporarily unavailable.
            </p>
            {result.failMessage && (
              <p style={{ opacity: 0.8, fontSize: 13 }}>{result.failMessage}</p>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button id="retry-quiz-btn" onClick={onBackToChapters}>← Back to chapters (Retry)</button>
            <button onClick={onReset} style={{ background: 'none', border: '1px solid var(--red-border)', color: 'var(--red)' }}>Home</button>
          </div>
        </div>
      </div>
    );
  }

  if (chapterMode === 'quiz') {
    return <QuizView result={result} onBackToChapters={onBackToChapters} onReset={onReset} />;
  }
  return <AnalyzeView result={result} onBackToChapters={onBackToChapters} onReset={onReset} />;
}
