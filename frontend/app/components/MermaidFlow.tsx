'use client';

import { useEffect, useRef, useState } from 'react';

type Step = string | { title: string; description?: string };

interface Props {
  steps: Step[];
  title?: string;
  caption?: string;
}

let mermaidReady = false;
let mermaidInitPromise: Promise<void> | null = null;

async function initMermaid() {
  if (mermaidReady) return;
  if (mermaidInitPromise) return mermaidInitPromise;
  mermaidInitPromise = (async () => {
    const mermaid = (await import('mermaid')).default;
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      themeVariables: {
        primaryColor: '#FFFFFF',
        primaryTextColor: '#111111',
        primaryBorderColor: '#E5E7EB',
        lineColor: '#9CA3AF',
        secondaryColor: '#F9FAFB',
        tertiaryColor: '#F3F4F6',
        fontSize: '12px',
        fontFamily: 'Inter, system-ui, sans-serif',
      },
      flowchart: {
        curve: 'linear',
        padding: 18,
        htmlLabels: true,
      },
    });
    mermaidReady = true;
  })();
  return mermaidInitPromise;
}

// Convert steps array → Mermaid flowchart syntax
function buildMermaidSyntax(steps: Step[]): string {
  const nodes: string[] = [];
  const edges: string[] = [];

  steps.forEach((step, i) => {
    const label = typeof step === 'string' ? step : step.title;
    const safe = label.replace(/"/g, "'").replace(/[<>]/g, '');
    const nodeId = `n${i}`;

    // Alternate shapes: rounded rect, stadium, subroutine
    if (i === 0) {
      nodes.push(`  ${nodeId}([\"${safe}\"])`); // stadium = start
    } else if (i === steps.length - 1) {
      nodes.push(`  ${nodeId}([\"${safe}\"])`); // stadium = end
    } else {
      nodes.push(`  ${nodeId}[\"${safe}\"]`); // rectangle = middle
    }

    if (i > 0) {
      edges.push(`  n${i - 1} --> n${i}`);
    }
  });

  return `flowchart TD\n${nodes.join('\n')}\n${edges.join('\n')}`;
}

let renderIdCounter = 0;

export default function MermaidFlow({ steps, title, caption }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  const [rendered, setRendered] = useState(false);
  const idRef = useRef(`mermaid-${++renderIdCounter}`);

  useEffect(() => {
    let cancelled = false;
    setRendered(false);
    setError(false);

    const run = async () => {
      try {
        await initMermaid();
        if (cancelled || !containerRef.current) return;

        const mermaid = (await import('mermaid')).default;
        const syntax = buildMermaidSyntax(steps);
        const id = idRef.current;

        const { svg } = await mermaid.render(id, syntax);
        if (cancelled || !containerRef.current) return;

        containerRef.current.innerHTML = svg;
        // Make SVG responsive
        const svgEl = containerRef.current.querySelector('svg');
        if (svgEl) {
          svgEl.style.width = '100%';
          svgEl.style.height = 'auto';
          svgEl.style.maxWidth = '100%';
          svgEl.removeAttribute('width');
          svgEl.removeAttribute('height');
        }
        setRendered(true);
      } catch (e) {
        console.warn('[MermaidFlow] render error:', e);
        if (!cancelled) setError(true);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [steps]);

  // Fallback: plain step boxes if Mermaid fails
  if (error) {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
        {steps.map((step, i) => {
          const label = typeof step === 'string' ? step : step.title;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                background: '#fff', color: '#111111',
                border: '1px solid #E5E7EB',
                borderRadius: 4, padding: '8px 14px',
                fontSize: 12, fontWeight: 600, lineHeight: 1.3,
                maxWidth: 140, textAlign: 'center',
              }}>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9CA3AF', marginBottom: 4 }}>
                  STEP {i + 1}
                </div>
                {label}
              </div>
              {i < steps.length - 1 && (
                <span style={{ color: '#9CA3AF', fontSize: 16, fontWeight: 300 }}>→</span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', minHeight: 120 }}>
      {!rendered && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: 120, gap: 8, color: '#9B9B95', fontSize: 13,
        }}>
          <div style={{
            width: 16, height: 16, border: '2px solid #E5E7EB',
            borderTopColor: '#4A6FA5', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          Building diagram…
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
      <div
        ref={containerRef}
        style={{
          opacity: rendered ? 1 : 0,
          transition: 'opacity 0.3s ease',
          display: 'flex', justifyContent: 'center',
        }}
      />
    </div>
  );
}
