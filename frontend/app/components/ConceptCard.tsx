'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { API_BASE } from '../lib/api';

const ConceptCharts = dynamic(() => import('./ConceptCharts'), { ssr: false });

export type Concept = {
  id: string;
  name: string;
  difficulty: 'Basic' | 'Intermediate' | 'Advanced';
  explanation: string;
  deeperExplanation: string;
  keyPoints: string[];
  prerequisites: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  visualization: any;
};

type Props = {
  concept: Concept;
  allConcepts: Concept[];
  onPrerequisiteClick: (id: string) => void;
};

const BADGE: Record<string, { bg: string; color: string }> = {
  Basic:        { bg: '#F0FDF4', color: '#16A34A' },
  Intermediate: { bg: '#FFFBEB', color: '#D97706' },
  Advanced:     { bg: '#FEF2F2', color: '#DC2626' },
};

const DIFF_BAR: Record<string, string> = {
  Basic: '#16A34A', Intermediate: '#D97706', Advanced: '#DC2626',
};

export default function ConceptCard({ concept, allConcepts, onPrerequisiteClick }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [simpler, setSimpler]   = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  const badge = BADGE[concept.difficulty];

  const prereqs = concept.prerequisites
    .map(pid => allConcepts.find(c => c.id === pid))
    .filter(Boolean) as Concept[];

  const handleSimpler = async () => {
    if (loading) return; // debounce: ignore if already in-flight
    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/api/explain-simpler`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conceptName: concept.name }),
      });
      const data = await res.json();
      if (res.ok) setSimpler(data.explanation);
    } catch { /* fail silently */ }
    finally { setLoading(false); }
  };

  return (
    <div
      className="concept-card"
      id={`concept-${concept.id}`}
      style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden' }}
    >
      {/* ── HEADER: badge + name + explanation ── */}
      <div style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <span style={{
            fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.08em', padding: '3px 10px', borderRadius: '4px',
            background: badge.bg, color: badge.color, flexShrink: 0,
          }}>
            {concept.difficulty}
          </span>
        </div>

        <h3 style={{
          fontSize: '18px', fontWeight: 600, color: '#111',
          lineHeight: 1.3, letterSpacing: '-0.01em', marginBottom: '10px',
        }}>
          {concept.name}
        </h3>

        <p style={{
          fontSize: '14px', color: '#555', lineHeight: 1.75, margin: 0,
        }}>
          {concept.explanation}
        </p>

      </div>

      {/* ── VISUALIZATION — below text, always visible ── */}
      {concept.visualization && (
        <div style={{ padding: '0 24px 4px' }}>
          <ConceptCharts visualization={concept.visualization} />
        </div>
      )}

      {/* ── LEARN MORE button — always at bottom ── */}
      <div style={{ padding: '12px 24px 20px' }}>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            background: 'none', border: 'none',
            cursor: 'pointer', fontSize: '13px', fontWeight: 500,
            color: expanded ? '#999' : '#111',
            fontFamily: 'inherit', padding: 0,
            display: 'flex', alignItems: 'center', gap: '5px',
            transition: 'color 0.15s',
          }}
        >
          <span style={{
            display: 'inline-block', width: '14px', height: '14px',
            borderRadius: '50%', border: '1.5px solid currentColor',
            lineHeight: '11px', textAlign: 'center', fontSize: '11px', flexShrink: 0,
          }}>
            {expanded ? '−' : '+'}
          </span>
          {expanded ? 'Show less' : 'Learn more'}
        </button>
      </div>

      {/* ── EXPANDED: deeper content ── */}
      {expanded && (
        <div style={{
          borderTop: '1px solid #F0F0ED',
          animation: 'expandIn 0.3s ease forwards',
        }}>
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Deeper explanation */}
            {concept.deeperExplanation && (
              <div>
                <p style={{
                  fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.1em', color: '#999', marginBottom: '10px',
                }}>In Depth</p>
                <p style={{ fontSize: '14px', color: '#333', lineHeight: 1.8 }}>
                  {concept.deeperExplanation}
                </p>
              </div>
            )}

            {/* Key points */}
            {concept.keyPoints?.length > 0 && (
              <div>
                <p style={{
                  fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.1em', color: '#999', marginBottom: '10px',
                }}>Key Takeaways</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {concept.keyPoints.map((pt, i) => (
                    <li key={i} style={{
                      fontSize: '13px', color: '#444', lineHeight: 1.65,
                      paddingLeft: '18px', position: 'relative',
                    }}>
                      <span style={{
                        position: 'absolute', left: 0, top: '8px',
                        width: '5px', height: '5px', borderRadius: '50%',
                        background: DIFF_BAR[concept.difficulty],
                      }} />
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Prerequisites */}
            {prereqs.length > 0 && (
              <div>
                <p style={{
                  fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.1em', color: '#999', marginBottom: '10px',
                }}>Understand First</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {prereqs.map(p => (
                    <span key={p.id}
                      onClick={() => onPrerequisiteClick(p.id)}
                      style={{
                        display: 'inline-block', background: '#F5F4EF',
                        border: '1px solid #E0DFD8', borderRadius: '6px',
                        padding: '4px 12px', fontSize: '12px', fontWeight: 500,
                        color: '#555', cursor: 'pointer', transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#EAEAE4'; e.currentTarget.style.color = '#111'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#F5F4EF'; e.currentTarget.style.color = '#555'; }}
                    >
                      {p.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Explain simpler */}
            <div style={{ borderTop: '1px solid #F0F0ED', paddingTop: '16px' }}>
              {simpler ? (
                <div>
                  <p style={{
                    fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.1em', color: 'var(--accent)', marginBottom: '10px',
                  }}>Simplified</p>
                  <p style={{ fontSize: '14px', color: '#333', lineHeight: 1.8 }}>{simpler}</p>
                </div>
              ) : (
                <button
                  id={`explain-simpler-${concept.id}`}
                  onClick={handleSimpler}
                  disabled={loading}
                  style={{
                    background: 'none', border: '1px solid #E0DFD8', borderRadius: '8px',
                    padding: '8px 16px', cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '13px', color: '#555', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    opacity: loading ? 0.65 : 1,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (!loading) { e.currentTarget.style.borderColor = '#111'; e.currentTarget.style.color = '#111'; } }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#E0DFD8'; e.currentTarget.style.color = '#555'; }}
                >
                  {loading
                    ? <><span className="spinner spinner-dark" style={{ width: 13, height: 13, borderWidth: '1.5px' }} /> Loading...</>
                    : '✦ Explain even simpler'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
