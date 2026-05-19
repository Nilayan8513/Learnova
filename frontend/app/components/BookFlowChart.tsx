'use client';

import { useMemo } from 'react';
import ReactFlow, {
  Background, Controls, MarkerType,
  type Node, type Edge,
} from 'reactflow';
import dagre from '@dagrejs/dagre';
import 'reactflow/dist/style.css';

export type FlowStep = {
  step_number: number;
  title: string;
  description: string;
  type: 'start' | 'process' | 'decision' | 'result' | 'end';
};

const NODE_W = 200;
const NODE_H = 90;

const nodeStyle: Record<FlowStep['type'], React.CSSProperties> = {
  start:    { background: '#D1FAE5', border: '2px solid #059669', color: '#065F46', borderRadius: '999px' },
  end:      { background: '#FEE2E2', border: '2px solid #DC2626', color: '#7F1D1D', borderRadius: '999px' },
  process:  { background: '#fff',    border: '2px solid #3B82F6', color: '#1E3A8A', borderRadius: '10px', boxShadow: '0 2px 8px rgba(59,130,246,0.1)' },
  decision: { background: '#FEF3C7', border: '2px solid #D97706', color: '#78350F', borderRadius: '10px', clipPath: 'polygon(50% 0%,100% 50%,50% 100%,0% 50%)', padding: '0' },
  result:   { background: '#EDE9FE', border: '2px solid #7C3AED', color: '#3B0764', borderRadius: '10px' },
};

function FlowNode({ data }: { data: { label: string; desc: string; type: FlowStep['type'] } }) {
  const s = nodeStyle[data.type];
  const isDiamond = data.type === 'decision';
  return (
    <div style={{
      ...s,
      width: NODE_W,
      minHeight: NODE_H,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: isDiamond ? '20px 16px' : '12px 16px',
      textAlign: 'center',
      userSelect: 'none',
    }}>
      <div style={{ fontWeight: 700, fontSize: '13px', lineHeight: 1.3 }}>{data.label}</div>
      {data.desc && (
        <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.8, lineHeight: 1.4 }}>{data.desc}</div>
      )}
    </div>
  );
}

const nodeTypes = { flowNode: FlowNode };

function getLayouted(steps: FlowStep[]) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', ranksep: 60, nodesep: 40 });

  const nodes: Node[] = steps.map(s => ({
    id: String(s.step_number),
    type: 'flowNode',
    data: { label: s.title, desc: s.description, type: s.type },
    position: { x: 0, y: 0 },
  }));

  const edges: Edge[] = steps.slice(0, -1).map((s, i) => ({
    id: `e${s.step_number}-${steps[i + 1].step_number}`,
    source: String(s.step_number),
    target: String(steps[i + 1].step_number),
    type: 'smoothstep',
    markerEnd: { type: MarkerType.ArrowClosed, color: '#9CA3AF' },
    style: { stroke: '#9CA3AF', strokeWidth: 2 },
  }));

  nodes.forEach(n => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
  edges.forEach(e => g.setEdge(e.source, e.target));
  dagre.layout(g);

  return {
    nodes: nodes.map(n => {
      const { x, y } = g.node(n.id);
      return { ...n, position: { x: x - NODE_W / 2, y: y - NODE_H / 2 } };
    }),
    edges,
  };
}

export default function BookFlowChart({ steps }: { steps: FlowStep[] }) {
  const { nodes, edges } = useMemo(() => getLayouted(steps), [steps]);
  const height = Math.max(600, steps.length * 140);

  return (
    <div style={{ width: '100%', height, background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#f1f5f9" gap={20} />
        <Controls />
      </ReactFlow>
    </div>
  );
}
