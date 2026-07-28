'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export interface GraphFeatureNode {
  id: string;
  label: string;
  weight: number;
}

export interface GraphProgram {
  id?: string;
  name: string;
  description?: string;
  affinity?: number;
  score?: number;
}

interface NeuralProgramGraphProps {
  features: GraphFeatureNode[];
  programs: GraphProgram[];
  className?: string;
}

type Pt = { x: number; y: number };

function polar(cx: number, cy: number, r: number, angle: number): Pt {
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

export function NeuralProgramGraph({ features, programs, className }: NeuralProgramGraphProps) {
  const [hover, setHover] = useState<string | null>(null);
  const [pulse, setPulse] = useState(0);
  const frame = useRef<number>();

  useEffect(() => {
    const tick = () => {
      setPulse((p) => (p + 0.02) % (Math.PI * 2));
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, []);

  const layout = useMemo(() => {
    const w = 640;
    const h = 420;
    const cx = w / 2;
    const cy = h / 2;
    const featureNodes = features.slice(0, 8).map((f, i) => {
      const angle = (i / Math.max(features.length, 1)) * Math.PI * 2 - Math.PI / 2;
      const r = 70 + (f.weight || 0.2) * 40;
      return { ...f, ...polar(cx, cy, r, angle), kind: 'feature' as const };
    });
    const programNodes = programs.slice(0, 8).map((p, i) => {
      const angle = (i / Math.max(programs.length, 1)) * Math.PI * 2 - Math.PI / 2;
      const r = 170;
      return {
        id: p.id || `p-${i}`,
        label: p.name,
        weight: p.affinity ?? p.score ?? 0.3,
        description: p.description,
        affinity: p.affinity ?? 0,
        ...polar(cx, cy, r, angle),
        kind: 'program' as const,
      };
    });
    return { w, h, cx, cy, featureNodes, programNodes };
  }, [features, programs]);

  const edges = useMemo(() => {
    const out: { key: string; x1: number; y1: number; x2: number; y2: number; strength: number }[] = [];
    for (const f of layout.featureNodes) {
      for (const p of layout.programNodes) {
        const strength = Math.min(1, (f.weight || 0.2) * (0.4 + (p.affinity || 0.2)));
        if (strength < 0.12) continue;
        out.push({
          key: `${f.id}-${p.id}`,
          x1: f.x,
          y1: f.y,
          x2: p.x,
          y2: p.y,
          strength,
        });
      }
    }
    return out;
  }, [layout]);

  const hoveredProgram = layout.programNodes.find((p) => p.id === hover);

  return (
    <div className={cn('relative overflow-hidden rounded-2xl border border-outline-variant/20 bg-surface-container-lowest/80', className)}>
      <svg viewBox={`0 0 ${layout.w} ${layout.h}`} className="h-auto w-full" role="img" aria-label="Red de afinidad vocacional">
        <defs>
          <radialGradient id="nn-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--primary, #003A70)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--primary, #003A70)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx={layout.cx} cy={layout.cy} r={90 + Math.sin(pulse) * 6} fill="url(#nn-core)" />
        <circle
          cx={layout.cx}
          cy={layout.cy}
          r={18}
          className="fill-primary"
          opacity={0.85 + Math.sin(pulse) * 0.1}
        />
        <text
          x={layout.cx}
          y={layout.cy + 4}
          textAnchor="middle"
          className="fill-on-primary text-[10px] font-semibold"
        >
          Twin
        </text>

        {edges.map((e) => {
          const dash = 6 + Math.sin(pulse + e.strength * 4) * 2;
          return (
            <line
              key={e.key}
              x1={e.x1}
              y1={e.y1}
              x2={e.x2}
              y2={e.y2}
              stroke="currentColor"
              className="text-primary"
              strokeOpacity={0.15 + e.strength * 0.55}
              strokeWidth={1 + e.strength * 3}
              strokeDasharray={`${dash} ${10 - e.strength * 4}`}
              strokeDashoffset={-pulse * 20 * e.strength}
            />
          );
        })}

        {layout.featureNodes.map((n) => (
          <g key={n.id}>
            <circle
              cx={n.x}
              cy={n.y}
              r={8 + (n.weight || 0) * 10}
              className="fill-secondary/80"
              opacity={0.7 + Math.sin(pulse + n.weight) * 0.15}
            />
            <text
              x={n.x}
              y={n.y + 22}
              textAnchor="middle"
              className="fill-on-surface text-[9px]"
            >
              {(n.label || '').slice(0, 18)}
            </text>
          </g>
        ))}

        {layout.programNodes.map((n) => {
          const active = hover === n.id;
          return (
            <g
              key={n.id}
              onMouseEnter={() => setHover(n.id)}
              onMouseLeave={() => setHover(null)}
              className="cursor-pointer"
            >
              <circle
                cx={n.x}
                cy={n.y}
                r={(active ? 16 : 12) + (n.affinity || 0) * 8}
                className={active ? 'fill-tertiary' : 'fill-primary'}
                opacity={0.75 + (n.affinity || 0) * 0.25}
              />
              <text
                x={n.x}
                y={n.y + 28}
                textAnchor="middle"
                className="fill-on-surface text-[10px] font-semibold"
              >
                {(n.label || '').slice(0, 22)}
              </text>
            </g>
          );
        })}
      </svg>

      {hoveredProgram && (
        <div className="pointer-events-none absolute bottom-3 left-3 right-3 rounded-xl border border-outline-variant/30 bg-surface/95 p-3 text-sm shadow-lg backdrop-blur">
          <p className="font-semibold text-primary">{hoveredProgram.label}</p>
          <p className="text-xs text-on-surface-variant">
            Afinidad {Math.round((hoveredProgram.affinity || 0) * 100)}%
          </p>
          {hoveredProgram.description && (
            <p className="mt-1 line-clamp-2 text-xs text-on-surface">{hoveredProgram.description}</p>
          )}
        </div>
      )}
    </div>
  );
}
