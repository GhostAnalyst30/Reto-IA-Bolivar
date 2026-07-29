'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Cpu,
  GraduationCap,
  Maximize,
  Pause,
  Play,
  Sparkles,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
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

type LayerKind = 'feature' | 'hidden' | 'program';

interface GNode {
  id: string;
  label: string;
  kind: LayerKind;
  activation: number;
  x: number;
  y: number;
  description?: string;
  affinity?: number;
}

interface GEdge {
  id: string;
  fromId: string;
  toId: string;
  weight: number;
  d: string;
  fromKind: LayerKind;
  toKind: LayerKind;
}

interface Pulse {
  uid: number;
  edgeId: string;
  stage: 1 | 2;
  duration: number;
  color: string;
  radius: number;
}

const VW = 720;
const VH = 480;
const COL = { feature: 110, hidden: 360, program: 612 };
const LAYER_DELAY: Record<LayerKind, number> = { feature: 0, hidden: 0.18, program: 0.36 };

const BRAND = {
  feature: '#f28c28',
  featureSoft: '#fbbf6a',
  hidden: '#4a90c2',
  hiddenSoft: '#7fb0d8',
  program: '#002576',
  programHot: '#4a90c2',
  edge: '#94a3b8',
  edgeActive: '#38bdf8',
  impulse: '#ffffff',
};

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const truncate = (s: string, max = 22) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return {
    r: parseInt(v.slice(0, 2), 16),
    g: parseInt(v.slice(2, 4), 16),
    b: parseInt(v.slice(4, 6), 16),
  };
}

function lerpColor(a: string, b: string, t: number) {
  const pa = hexToRgb(a);
  const pb = hexToRgb(b);
  return `rgb(${Math.round(pa.r + (pb.r - pa.r) * t)}, ${Math.round(pa.g + (pb.g - pa.g) * t)}, ${Math.round(pa.b + (pb.b - pa.b) * t)})`;
}

function nodeFill(kind: LayerKind, activation: number) {
  if (kind === 'feature') return BRAND.feature;
  if (kind === 'hidden') return lerpColor(BRAND.hidden, BRAND.hiddenSoft, activation);
  return lerpColor(BRAND.program, BRAND.programHot, activation);
}

function nodeRadius(n: GNode) {
  return n.kind === 'hidden' ? 14 + n.activation * 5 : 11 + n.activation * 8;
}

function buildLayout(features: GraphFeatureNode[], programs: GraphProgram[]) {
  const feats = features.slice(0, 8);
  const progs = programs.slice(0, 8);
  const hiddenCount = Math.min(5, Math.max(3, Math.ceil((feats.length + progs.length) / 3)));

  const featureNodes: GNode[] = feats.map((f, i) => {
    const t = feats.length <= 1 ? 0.5 : i / (feats.length - 1);
    return {
      id: f.id,
      label: f.label,
      kind: 'feature',
      activation: clamp01(f.weight || 0.2),
      x: COL.feature,
      y: 60 + t * (VH - 120),
    };
  });

  const hiddenNodes: GNode[] = Array.from({ length: hiddenCount }, (_, i) => {
    const t = hiddenCount <= 1 ? 0.5 : i / (hiddenCount - 1);
    return {
      id: `h-${i}`,
      label: i === Math.floor(hiddenCount / 2) ? 'Twin' : `H${i + 1}`,
      kind: 'hidden',
      activation: 0.45 + (i % 3) * 0.12,
      x: COL.hidden,
      y: 90 + t * (VH - 180),
    };
  });

  const programNodes: GNode[] = progs.map((p, i) => {
    const t = progs.length <= 1 ? 0.5 : i / (progs.length - 1);
    const affinity = clamp01(p.affinity ?? p.score ?? 0.3);
    return {
      id: p.id || `p-${i}`,
      label: p.name,
      kind: 'program',
      activation: affinity,
      affinity,
      description: p.description,
      x: COL.program,
      y: 60 + t * (VH - 120),
    };
  });

  const allNodes = [...featureNodes, ...hiddenNodes, ...programNodes];
  const byId = new Map(allNodes.map((n) => [n.id, n]));
  const edges: GEdge[] = [];
  let ei = 0;

  const pushEdge = (from: GNode, to: GNode, weight: number, bend: number) => {
    if (weight < 0.16) return;
    const mx = (from.x + to.x) / 2;
    const my = (from.y + to.y) / 2 + bend;
    edges.push({
      id: `e${ei++}`,
      fromId: from.id,
      toId: to.id,
      weight,
      fromKind: from.kind,
      toKind: to.kind,
      d: `M ${from.x} ${from.y} Q ${mx} ${my} ${to.x} ${to.y}`,
    });
  };

  for (const f of featureNodes) {
    for (const h of hiddenNodes) {
      pushEdge(f, h, clamp01(f.activation * (0.55 + h.activation * 0.45)), -8 - f.activation * 14);
    }
  }
  for (const h of hiddenNodes) {
    for (const p of programNodes) {
      pushEdge(h, p, clamp01(h.activation * (0.35 + (p.affinity || 0.25))), 8 + (p.affinity || 0.25) * 14);
    }
  }

  return { featureNodes, hiddenNodes, programNodes, allNodes, edges, byId };
}

export function NeuralProgramGraph({ features, programs, className }: NeuralProgramGraphProps) {
  const layout = useMemo(() => buildLayout(features, programs), [features, programs]);
  const hasData = layout.allNodes.length > 0;

  const [hoverId, setHoverId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null);
  const [pulsesOn, setPulsesOn] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pulses, setPulses] = useState<Pulse[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const uidRef = useRef(0);

  const reduceMotion = useMemo(
    () => (typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false),
    [],
  );

  const focusId = selectedId || hoverId;
  const activeEdges = useMemo(() => {
    if (!focusId) return null;
    const set = new Set<string>();
    layout.edges.forEach((e) => {
      if (e.fromId === focusId || e.toId === focusId) set.add(e.id);
    });
    return set;
  }, [focusId, layout.edges]);

  const outgoingFromHidden = useMemo(() => {
    const map = new Map<string, GEdge[]>();
    layout.edges.forEach((e) => {
      if (e.fromKind === 'hidden') {
        const arr = map.get(e.fromId) || [];
        arr.push(e);
        map.set(e.fromId, arr);
      }
    });
    return map;
  }, [layout.edges]);

  const featureToHidden = useMemo(
    () => layout.edges.filter((e) => e.fromKind === 'feature').sort((a, b) => b.weight - a.weight),
    [layout.edges],
  );

  const edgeById = useMemo(() => new Map(layout.edges.map((e) => [e.id, e])), [layout.edges]);

  const spawnPulse = useCallback(
    (edge: GEdge, stage: 1 | 2) => {
      const duration = 1.1 - edge.weight * 0.35;
      const color = stage === 1 ? BRAND.featureSoft : BRAND.edgeActive;
      const radius = 2.4 + edge.weight * 2.2;
      const uid = ++uidRef.current;
      setPulses((p) => [...p, { uid, edgeId: edge.id, stage, duration, color, radius }]);
      window.setTimeout(() => {
        setPulses((p) => p.filter((x) => x.uid !== uid));
      }, duration * 1000 + 80);
      if (stage === 1) {
        const next = (outgoingFromHidden.get(edge.toId) || [])
          .slice()
          .sort((a, b) => b.weight - a.weight)
          .slice(0, 2);
        next.forEach((ne, idx) => {
          window.setTimeout(() => spawnPulse(ne, 2), duration * 1000 + idx * 90);
        });
      }
    },
    [outgoingFromHidden],
  );

  useEffect(() => {
    if (!pulsesOn || reduceMotion || !featureToHidden.length) return;
    const tick = () => {
      const pool = featureToHidden.slice(0, Math.min(6, featureToHidden.length));
      const pick = pool[Math.floor(Math.random() * pool.length)];
      if (pick) spawnPulse(pick, 1);
    };
    const id = window.setInterval(tick, 950);
    return () => window.clearInterval(id);
  }, [pulsesOn, reduceMotion, featureToHidden, spawnPulse]);

  useEffect(() => setPulses([]), [layout]);

  const onNodePointerMove = (e: React.PointerEvent, id: string) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHoverId(id);
    setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const onNodePointerLeave = () => {
    setHoverId(null);
    if (!selectedId) setTooltip(null);
  };

  const onNodeClick = (id: string) => {
    setSelectedId((cur) => (cur === id ? null : id));
  };

  const onNodeKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onNodeClick(id);
    } else if (e.key === 'Escape') {
      setSelectedId(null);
      setTooltip(null);
    }
  };

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedId(null);
        setTooltip(null);
      }
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, []);

  const focusNode = focusId ? layout.byId.get(focusId) : null;
  const zoomTransform = `translate(${VW / 2} ${VH / 2}) scale(${zoom}) translate(${-VW / 2} ${-VH / 2})`;

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-outline-variant/20 bg-surface-container-lowest',
        'dark:bg-[#070d1a]',
        className,
      )}
    >
      {!hasData ? (
        <div className="flex min-h-[360px] flex-col items-center justify-center gap-2 px-6 py-16 text-center">
          <Sparkles className="h-8 w-8 text-primary" aria-hidden />
          <p className="font-medium text-on-surface">Aún no hay red para mostrar</p>
          <p className="max-w-sm text-sm text-on-surface-variant">
            Completa el test vocacional para que tu red de afinidad se genere a partir de tus señales y el Digital Twin.
          </p>
        </div>
      ) : (
        <>
          <svg
            viewBox={`0 0 ${VW} ${VH}`}
            preserveAspectRatio="xMidYMid meet"
            className="block w-full"
            style={{ aspectRatio: `${VW} / ${VH}` }}
            role="img"
            aria-label="Red neuronal de afinidad vocacional"
          >
            <title>Red neuronal de afinidad vocacional</title>
            <desc>
              Tres capas: señales de entrada, capa Twin y programas. El grosor de cada conexión representa su peso y el
              color de los programas indica la afinidad.
            </desc>
            <defs>
              <radialGradient id="np-bg" cx="50%" cy="40%" r="75%">
                <stop offset="0%" stopColor="var(--surface-container-lowest)" />
                <stop offset="100%" stopColor="var(--surface-container)" />
              </radialGradient>
              <filter id="np-glow" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="3.2" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <pattern id="np-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.08" />
              </pattern>
            </defs>

            <rect x="0" y="0" width={VW} height={VH} fill="url(#np-bg)" className="text-on-surface" />
            <rect x="0" y="0" width={VW} height={VH} fill="url(#np-grid)" className="text-on-surface" />

            <g transform={zoomTransform}>
              {/* Column captions */}
              <g aria-hidden className="select-none">
                {[
                  { x: COL.feature, label: 'Señales', color: BRAND.feature },
                  { x: COL.hidden, label: 'Twin', color: BRAND.hidden },
                  { x: COL.program, label: 'Programas', color: BRAND.programHot },
                ].map((c) => (
                  <text
                    key={c.label}
                    x={c.x}
                    y={28}
                    textAnchor="middle"
                    fontSize="13"
                    fontWeight="700"
                    fill={c.color}
                    style={{ letterSpacing: '0.12em', textTransform: 'uppercase' }}
                  >
                    {c.label}
                  </text>
                ))}
              </g>

              {/* Edges */}
              <g aria-hidden>
                {layout.edges.map((e) => {
                  const isActive = activeEdges?.has(e.id);
                  const baseOpacity = 0.18 + e.weight * 0.5;
                  const opacity = activeEdges
                    ? isActive
                      ? Math.min(1, baseOpacity + 0.35)
                      : baseOpacity * 0.12
                    : baseOpacity;
                  const stroke = isActive ? BRAND.edgeActive : BRAND.edge;
                  const sw = 0.6 + e.weight * 3.4;
                  return (
                    <path
                      key={e.id}
                      id={e.id}
                      d={e.d}
                      fill="none"
                      stroke={stroke}
                      strokeWidth={sw}
                      strokeLinecap="round"
                      opacity={opacity}
                      style={{ transition: 'opacity 180ms ease, stroke 180ms ease' }}
                    />
                  );
                })}
              </g>

              {/* Pulses */}
              <g aria-hidden>
                {pulses.map((p) => (
                  <circle key={p.uid} r={p.radius} fill={p.color} opacity={0.95} filter="url(#np-glow)">
                    <animateMotion
                      dur={`${p.duration}s`}
                      repeatCount="1"
                      fill="freeze"
                      path={edgeById.get(p.edgeId)?.d}
                    />
                  </circle>
                ))}
              </g>

              {/* Nodes */}
              <g>
                {layout.allNodes.map((n) => {
                  const r = nodeRadius(n);
                  const fill = nodeFill(n.kind, n.activation);
                  const isFocus = focusId === n.id;
                  const showPct = n.kind === 'program' && (n.affinity ?? 0) >= 0.4;
                  const delay = LAYER_DELAY[n.kind];
                  return (
                    <motion.g
                      key={n.id}
                      initial={{ opacity: 0, scale: 0.4 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
                      style={{ transformOrigin: `${n.x}px ${n.y}px`, cursor: 'pointer' }}
                      onPointerMove={(e) => onNodePointerMove(e, n.id)}
                      onPointerLeave={onNodePointerLeave}
                      onClick={() => onNodeClick(n.id)}
                      onKeyDown={(e) => onNodeKeyDown(e, n.id)}
                      role="button"
                      tabIndex={0}
                      aria-label={`${n.label} · ${n.kind === 'program' ? `Afinidad ${Math.round((n.affinity || 0) * 100)}%` : `Activación ${Math.round(n.activation * 100)}%`}`}
                    >
                      {isFocus && <circle cx={n.x} cy={n.y} r={r + 6} fill="none" stroke={fill} strokeWidth="1.5" opacity="0.6" />}
                      <circle
                        cx={n.x}
                        cy={n.y}
                        r={r}
                        fill={fill}
                        stroke={isFocus ? BRAND.impulse : 'rgba(255,255,255,0.25)'}
                        strokeWidth={isFocus ? 1.5 : 0.8}
                        filter={isFocus ? 'url(#np-glow)' : undefined}
                      />
                      {showPct && (
                        <text
                          x={n.x}
                          y={n.y}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize={r > 14 ? 9 : 8}
                          fontWeight="700"
                          fill="#ffffff"
                        >
                          {Math.round((n.affinity || 0) * 100)}
                        </text>
                      )}
                      <text
                        x={n.x}
                        y={n.y + r + 12}
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="600"
                        fill="var(--on-surface)"
                      >
                        {truncate(n.label)}
                      </text>
                    </motion.g>
                  );
                })}
              </g>
            </g>
          </svg>
        </>
      )}

      {/* Legend */}
      <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-2 text-[10px] font-medium uppercase tracking-wide">
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-700 dark:text-amber-300">
          <Sparkles className="h-3 w-3" /> Señales
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-2 py-0.5 text-sky-700 dark:text-sky-300">
          <Cpu className="h-3 w-3" /> Activación
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-primary">
          <GraduationCap className="h-3 w-3" /> Programas
        </span>
        <span className="hidden items-center gap-1 rounded-full bg-surface-container-high px-2 py-0.5 text-on-surface-variant sm:inline-flex">
          Peso = grosor
        </span>
      </div>

      {/* Controls */}
      <div className="absolute right-3 top-3 flex flex-col gap-1.5">
        <ControlButton label={pulsesOn ? 'Pausar pulsos' : 'Reanudar pulsos'} onClick={() => setPulsesOn((v) => !v)}>
          {pulsesOn ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </ControlButton>
        <ControlButton label="Acercar" onClick={() => setZoom((z) => Math.min(2, +(z + 0.25).toFixed(2)))}>
          <ZoomIn className="h-3.5 w-3.5" />
        </ControlButton>
        <ControlButton label="Alejar" onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.25).toFixed(2)))}>
          <ZoomOut className="h-3.5 w-3.5" />
        </ControlButton>
        <ControlButton label="Restablecer vista" onClick={() => setZoom(1)}>
          <Maximize className="h-3.5 w-3.5" />
        </ControlButton>
      </div>

      {/* Tooltip / Detail panel */}
      <AnimatePresence>
        {focusNode && tooltip && (
          <motion.div
            key={focusNode.id + (selectedId ? '-locked' : '-hover')}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.15 }}
            className="pointer-events-auto absolute bottom-3 left-3 right-3 max-w-md rounded-xl border border-white/10 bg-surface-container-lowest/95 p-3 text-sm shadow-lg backdrop-blur dark:bg-slate-950/90"
            aria-live="polite"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold text-primary">{focusNode.label}</p>
                <p className="text-xs text-on-surface-variant">
                  {focusNode.kind === 'program'
                    ? `Afinidad ${Math.round((focusNode.affinity || 0) * 100)}%`
                    : `Activación ${Math.round(focusNode.activation * 100)}%`}
                  {' · '}
                  {focusNode.kind === 'feature'
                    ? 'Señal de entrada'
                    : focusNode.kind === 'hidden'
                      ? 'Capa Twin'
                      : 'Programa'}
                </p>
              </div>
              {selectedId && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(null);
                    setTooltip(null);
                  }}
                  className="shrink-0 rounded-md p-1 text-on-surface-variant hover:bg-surface-container-high"
                  aria-label="Soltar selección"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {focusNode.description && (
              <p className="mt-1 line-clamp-2 text-xs text-on-surface">{focusNode.description}</p>
            )}
            {selectedId && (
              <p className="mt-1 text-[10px] text-on-surface-variant">Fijado — clic en el nodo o Esc para soltar.</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ControlButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-outline-variant/40 bg-surface-container-lowest/90 text-on-surface-variant shadow-sm backdrop-blur transition hover:bg-surface-container-high hover:text-primary dark:bg-slate-950/70"
    >
      {children}
    </button>
  );
}



