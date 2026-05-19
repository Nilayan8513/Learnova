'use client';

import {
  LineChart, Line, BarChart, Bar, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import MermaidFlow from './MermaidFlow';

// ─── Academic palette ─────────────────────────────────────────────────────────
const ACADEMIC_BLUE  = '#4A6FA5';
const ACADEMIC_CORAL = '#E8572A';
const ACADEMIC_TEAL  = '#4A8C8C';
const ACADEMIC_SAGE  = '#6B8F71';
const ACADEMIC_WARM  = '#8C6B4A';

const LINE_COLORS    = [ACADEMIC_BLUE, ACADEMIC_CORAL, ACADEMIC_TEAL, ACADEMIC_SAGE, ACADEMIC_WARM];
const BAR_COLOR      = ACADEMIC_BLUE;
const SCATTER_COLORS = [ACADEMIC_BLUE, ACADEMIC_CORAL, ACADEMIC_TEAL, ACADEMIC_SAGE, ACADEMIC_WARM];
const RADAR_COLORS   = [ACADEMIC_BLUE, ACADEMIC_CORAL, ACADEMIC_TEAL, ACADEMIC_SAGE];

const GRAY       = '#6B7280';
const GRID_COLOR = '#F3F4F6';
const AXIS_COLOR = '#9CA3AF';

// ─── Types ────────────────────────────────────────────────────────────────────
type LineViz    = { type:'line';    title:string; xLabel:string; yLabel:string; caption:string; series:{name:string;data:{x:string|number;y:number}[]}[] };
type BarViz     = { type:'bar';     title:string; xLabel:string; yLabel:string; caption:string; data:{label:string;value:number}[] };
type ScatterViz = { type:'scatter'; title:string; xLabel:string; yLabel:string; caption:string; points:{x:number;y:number;label?:string}[] };
type RadarViz   = { type:'radar';   title:string; caption:string; categories:string[]; series:{name:string;values:number[]}[] };
type TableViz   = { type:'table';   title:string; caption:string; headers:string[]; rows:{cells:string[]}[]; differenceColumnIndex?:number };
type FlowViz    = { type:'flow';    title:string; caption:string; steps:{title:string;description:string}[] };
type Viz = LineViz|BarViz|ScatterViz|RadarViz|TableViz|FlowViz;

// ─── Shared chart wrapper ─────────────────────────────────────────────────────
function ChartWrapper({ title, caption, children }: { type:string; title:string; caption:string; children:React.ReactNode }) {
  return (
    <div style={{ marginTop: 16 }}>
      {title && (
        <p style={{ fontSize: 13, fontWeight: 700, color: '#111111', margin: '0 0 10px', lineHeight: 1.4, fontFamily: 'Inter, sans-serif' }}>
          {title}
        </p>
      )}
      <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '16px 16px 12px' }}>{children}</div>
      </div>
      {caption && (
        <p style={{ margin: '6px 0 0', fontSize: 11, color: '#6B7280', lineHeight: 1.6, fontStyle: 'italic', fontFamily: 'Inter, sans-serif' }}>
          {caption}
        </p>
      )}
    </div>
  );
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: { active?:boolean; payload?:{name:string;value:number;color:string}[]; label?:string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:4, padding:'8px 12px',
      boxShadow:'0 2px 8px rgba(0,0,0,0.08)', fontSize:12, maxWidth:220, fontFamily:'Inter,sans-serif' }}>
      {label && <p style={{ fontWeight:700, color:'#111111', marginBottom:4, fontSize:12 }}>{label}</p>}
      {payload.map((p, i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', gap:6, color:'#374151', marginBottom:i<payload.length-1?3:0 }}>
          <span style={{ width:8, height:8, borderRadius:2, background:p.color, flexShrink:0, display:'inline-block' }} />
          <span style={{ fontWeight:600 }}>{p.name}:</span>
          <span>{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── LINE CHART ───────────────────────────────────────────────────────────────
function LineChartViz({ viz }: { viz:LineViz }) {
  const allX = Array.from(new Set(viz.series.flatMap(s => s.data.map(d => String(d.x))))).sort();
  const data = allX.map(x => {
    const row: Record<string,string|number> = { x };
    viz.series.forEach(s => { const pt = s.data.find(d => String(d.x) === x); row[s.name] = pt ? pt.y : null!; });
    return row;
  });

  const maxLabelLen = Math.max(...allX.map(x => String(x).length));
  const angleNeeded = allX.length > 5 && maxLabelLen > 6;

  // Bottom margin: space for xAxis ticks + xAxis label
  const bottomMargin = angleNeeded ? 60 : 40;

  return (
    <ChartWrapper type="line" title={viz.title} caption={viz.caption}>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 8, right: 24, left: 8, bottom: bottomMargin }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
          <XAxis
            dataKey="x"
            tick={{ fontSize: 11, fill: AXIS_COLOR, fontFamily: 'Inter' }}
            axisLine={{ stroke: '#E5E7EB' }}
            tickLine={false}
            angle={angleNeeded ? -30 : 0}
            textAnchor={angleNeeded ? 'end' : 'middle'}
            height={angleNeeded ? 56 : 32}
            label={viz.xLabel ? {
              value: viz.xLabel,
              position: 'insideBottom',
              offset: -8,
              fontSize: 11,
              fill: GRAY,
              fontFamily: 'Inter',
            } : undefined}
          />
          <YAxis
            tick={{ fontSize: 11, fill: AXIS_COLOR, fontFamily: 'Inter' }}
            axisLine={false}
            tickLine={false}
            width={48}
            label={viz.yLabel ? {
              value: viz.yLabel,
              angle: -90,
              position: 'insideLeft',
              offset: 8,
              fontSize: 11,
              fill: GRAY,
              fontFamily: 'Inter',
              dy: 40,
            } : undefined}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, color: GRAY, paddingTop: 6, fontFamily: 'Inter' }}
            verticalAlign="top"
            align="center"
          />
          {viz.series.map((s, i) => (
            <Line key={s.name} type="monotone" dataKey={s.name}
              stroke={LINE_COLORS[i % LINE_COLORS.length]} strokeWidth={2}
              dot={{ r: 4, fill: LINE_COLORS[i % LINE_COLORS.length], stroke: '#fff', strokeWidth: 1.5 }}
              activeDot={{ r: 5 }} connectNulls />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}

// ─── BAR CHART ────────────────────────────────────────────────────────────────
function BarChartViz({ viz }: { viz:BarViz }) {
  const chartData = viz.data.map(d => ({ name: d.label, value: d.value }));
  const maxVal = Math.max(...viz.data.map(d => d.value));
  const needsAngle = chartData.length > 4 || Math.max(...chartData.map(d => d.name.length)) > 10;
  const bottomMargin = needsAngle ? 64 : 44;

  return (
    <ChartWrapper type="bar" title={viz.title} caption={viz.caption}>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData} margin={{ top: 24, right: 24, left: 8, bottom: bottomMargin }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: AXIS_COLOR, fontFamily: 'Inter' }}
            axisLine={{ stroke: '#E5E7EB' }}
            tickLine={false}
            angle={needsAngle ? -35 : 0}
            textAnchor={needsAngle ? 'end' : 'middle'}
            height={needsAngle ? 60 : 32}
            interval={0}
            label={viz.xLabel ? {
              value: viz.xLabel,
              position: 'insideBottom',
              offset: -8,
              fontSize: 11,
              fill: GRAY,
              fontFamily: 'Inter',
            } : undefined}
          />
          <YAxis
            tick={{ fontSize: 11, fill: AXIS_COLOR, fontFamily: 'Inter' }}
            axisLine={false}
            tickLine={false}
            width={48}
            label={viz.yLabel ? {
              value: viz.yLabel,
              angle: -90,
              position: 'insideLeft',
              offset: 8,
              fontSize: 11,
              fill: GRAY,
              fontFamily: 'Inter',
              dy: 40,
            } : undefined}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(74,111,165,0.06)' }} />
          <Bar dataKey="value" radius={[3, 3, 0, 0]} maxBarSize={56} fill={BAR_COLOR}>
            {chartData.map((_, i) => <Cell key={i} fill={BAR_COLOR} />)}
            <LabelList dataKey="value" position="top"
              style={{ fontSize: 11, fontWeight: 600, fill: GRAY, fontFamily: 'Inter' }}
              formatter={(v: number) => maxVal > 1000 ? v.toLocaleString() : v} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}

// ─── SCATTER PLOT (custom SVG) ────────────────────────────────────────────────
function ScatterVizChart({ viz }: { viz:ScatterViz }) {
  const W = 520, H = 280;
  const M = { top: 20, right: 24, bottom: 56, left: 64 };
  const pw = W - M.left - M.right, ph = H - M.top - M.bottom;

  const xs = viz.points.map(p => p.x), ys = viz.points.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys, 0), maxY = Math.max(...ys);
  const padX = (maxX - minX) * 0.12 || 0.1, padY = (maxY - minY) * 0.15 || 1;
  const sx = (x: number) => ((x - (minX - padX)) / (maxX - minX + padX * 2)) * pw;
  const sy = (y: number) => ph - ((y - (minY - padY)) / (maxY - minY + padY * 2)) * ph;

  const n = viz.points.length;
  const sumX = xs.reduce((a, b) => a + b, 0), sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = viz.points.reduce((s, p) => s + p.x * p.y, 0), sumXX = xs.reduce((s, x) => s + x * x, 0);
  const slope = n > 1 ? (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX) : 0;
  const intercept = (sumY - slope * sumX) / n;
  const yTicks = 5, yStep = (maxY - minY + padY * 2) / yTicks;

  return (
    <ChartWrapper type="scatter" title={viz.title} caption={viz.caption}>
      <div style={{ overflowX: 'auto', display: 'flex', justifyContent: 'center' }}>
        <svg width={W} height={H} style={{ fontFamily: 'Inter,sans-serif', display: 'block' }}>
          {/* Y-axis label */}
          <text
            x={16} y={M.top + ph / 2}
            textAnchor="middle" fontSize={11} fill={GRAY}
            transform={`rotate(-90, 16, ${M.top + ph / 2})`}
          >{viz.yLabel}</text>

          <g transform={`translate(${M.left},${M.top})`}>
            {/* Grid + Y ticks */}
            {Array.from({ length: yTicks + 1 }, (_, i) => {
              const y = ph - (i / yTicks) * ph, val = (minY - padY) + i * yStep;
              return <g key={i}>
                <line x1={0} y1={y} x2={pw} y2={y} stroke={GRID_COLOR} strokeWidth={1} />
                <text x={-8} y={y + 4} textAnchor="end" fontSize={10} fill={AXIS_COLOR}>{val.toFixed(1)}</text>
              </g>;
            })}

            {/* X-axis line */}
            <line x1={0} y1={ph} x2={pw} y2={ph} stroke="#E5E7EB" strokeWidth={1} />

            {/* X ticks */}
            {[minX, (minX + maxX) / 2, maxX].map((x, i) => (
              <text key={i} x={sx(x)} y={ph + 18} textAnchor="middle" fontSize={10} fill={AXIS_COLOR}>
                {x % 1 === 0 ? x : x.toFixed(2)}
              </text>
            ))}

            {/* X-axis label — centred, well below ticks */}
            <text x={pw / 2} y={ph + 40} textAnchor="middle" fontSize={11} fill={GRAY}>{viz.xLabel}</text>

            {/* Trend line */}
            {n > 1 && (
              <line
                x1={sx(minX - padX)} y1={sy(slope * (minX - padX) + intercept)}
                x2={sx(maxX + padX)} y2={sy(slope * (maxX + padX) + intercept)}
                stroke={AXIS_COLOR} strokeWidth={1.5} strokeDasharray="4 3" opacity={0.5}
              />
            )}

            {/* Points */}
            {viz.points.map((p, i) => {
              const cx = sx(p.x), cy = sy(p.y);
              const labelAbove = cy > ph / 2;
              return <g key={i}>
                <circle cx={cx} cy={cy} r={5} fill={SCATTER_COLORS[i % SCATTER_COLORS.length]} stroke="#fff" strokeWidth={1.5} />
                {p.label && <>
                  <rect x={cx - 42} y={labelAbove ? cy - 30 : cy + 8} width={84} height={18} rx={3}
                    fill="white" stroke="#E5E7EB" strokeWidth={1} opacity={0.95} />
                  <text x={cx} y={labelAbove ? cy - 17 : cy + 21}
                    textAnchor="middle" fontSize={10} fill="#374151" fontWeight={600}>{p.label}</text>
                </>}
              </g>;
            })}
          </g>
        </svg>
      </div>
    </ChartWrapper>
  );
}

// ─── RADAR CHART ──────────────────────────────────────────────────────────────
function RadarChartViz({ viz }: { viz:RadarViz }) {
  const data = viz.categories.map((cat, i) => {
    const row: Record<string, string | number> = { category: cat };
    viz.series.forEach(s => { row[s.name] = s.values[i] ?? 0; });
    return row;
  });

  return (
    <ChartWrapper type="radar" title={viz.title} caption={viz.caption}>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={data} margin={{ top: 16, right: 56, bottom: 16, left: 56 }}>
          <PolarGrid gridType="circle" stroke="#E5E7EB" />
          <PolarAngleAxis dataKey="category" tick={{ fontSize: 11, fill: '#374151', fontFamily: 'Inter', fontWeight: 500 }} />
          <PolarRadiusAxis tick={{ fontSize: 9, fill: AXIS_COLOR }} axisLine={false} tickLine={false} domain={[0, 1]} />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, color: GRAY, paddingTop: 8, fontFamily: 'Inter' }}
            verticalAlign="bottom"
            align="center"
          />
          {viz.series.map((s, i) => (
            <Radar key={s.name} name={s.name} dataKey={s.name}
              stroke={RADAR_COLORS[i % RADAR_COLORS.length]}
              fill={RADAR_COLORS[i % RADAR_COLORS.length]}
              fillOpacity={0.12} strokeWidth={2}
              dot={{ r: 3.5, fill: RADAR_COLORS[i % RADAR_COLORS.length], stroke: '#fff', strokeWidth: 1.5 }} />
          ))}
        </RadarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}

// ─── COMPARISON TABLE ─────────────────────────────────────────────────────────
function TableViz({ viz }: { viz:TableViz }) {
  const getValueColor = (v: string) => !v ? '#374151' : v.startsWith('+') ? '#166534' : v.startsWith('-') ? '#7F1D1D' : '#374151';

  return (
    <ChartWrapper type="table" title={viz.title} caption={viz.caption}>
      <div style={{ overflowX: 'auto', border: '1px solid #E5E7EB', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'Inter,sans-serif' }}>
          <thead>
            <tr style={{ background: '#F3F4F6' }}>
              {viz.headers.map((h, i) => (
                <th key={i} style={{
                  textAlign: i === 0 ? 'left' : 'right',
                  padding: '9px 14px',
                  fontSize: 10, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  color: '#111111', whiteSpace: 'nowrap',
                  borderBottom: '1px solid #E5E7EB',
                  borderRight: i < viz.headers.length - 1 ? '1px solid #E5E7EB' : 'none',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {viz.rows.map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}>
                {row.cells.map((cell, j) => {
                  const isLast = j === viz.headers.length - 1;
                  return (
                    <td key={j} style={{
                      padding: '9px 14px',
                      textAlign: j === 0 ? 'left' : 'right',
                      color: isLast ? getValueColor(cell) : '#374151',
                      fontWeight: j === 0 ? 600 : 400,
                      borderBottom: '1px solid #E5E7EB',
                      borderRight: j < viz.headers.length - 1 ? '1px solid #E5E7EB' : 'none',
                      fontSize: 12, lineHeight: 1.5,
                    }}>{cell}</td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartWrapper>
  );
}

// ─── FLOW DIAGRAM ─────────────────────────────────────────────────────────────
function FlowViz({ viz }: { viz: FlowViz }) {
  const rawSteps = (viz as any).data?.steps || viz.steps || [];
  const steps: string[] = rawSteps.map((s: any) =>
    typeof s === 'string' ? s : s.title || String(s)
  ).filter(Boolean);
  const safeSteps = steps.length >= 2 ? steps : ['Start', 'Process', 'End'];

  // If many steps, wrap into rows of 4
  const ROW_SIZE = 4;
  const rows: string[][] = [];
  for (let i = 0; i < safeSteps.length; i += ROW_SIZE) {
    rows.push(safeSteps.slice(i, i + ROW_SIZE));
  }

  return (
    <ChartWrapper type="flow" title={viz.title} caption={viz.caption}>
      <div style={{ background: '#FFFFFF', padding: '4px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rows.map((rowSteps, rowIdx) => (
          <div key={rowIdx} style={{ display: 'flex', flexWrap: 'nowrap', alignItems: 'center', justifyContent: 'center', gap: 0 }}>
            {rowSteps.map((step, i) => {
              // Absolute index for step number
              const absIdx = rowIdx * ROW_SIZE + i;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                  <div style={{
                    background: '#FFFFFF', border: '1px solid #E5E7EB',
                    borderRadius: 6, padding: '10px 14px',
                    minWidth: 90, maxWidth: 140, textAlign: 'center',
                    flexShrink: 0,
                  }}>
                    <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9CA3AF', marginBottom: 5 }}>
                      STEP {absIdx + 1}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#111111', lineHeight: 1.35, wordBreak: 'break-word' }}>
                      {step}
                    </div>
                  </div>
                  {i < rowSteps.length - 1 && (
                    <span style={{ color: '#9CA3AF', fontSize: 16, margin: '0 6px', flexShrink: 0, lineHeight: 1 }}>→</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </ChartWrapper>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function ConceptCharts({ visualization }: { visualization: Viz }) {
  if (!visualization) return null;
  try {
    switch (visualization.type) {
      case 'line':    return <LineChartViz viz={visualization} />;
      case 'bar':     return <BarChartViz viz={visualization} />;
      case 'scatter': return <ScatterVizChart viz={visualization} />;
      case 'radar':   return <RadarChartViz viz={visualization} />;
      case 'table':   return <TableViz viz={visualization} />;
      case 'flow':    return <FlowViz viz={visualization} />;
      default:        return null;
    }
  } catch { return null; }
}
