'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
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

interface GraphNode {
  id: string;
  label: string;
  kind: LayerKind;
  activation: number;
  position: THREE.Vector3;
  description?: string;
  affinity?: number;
}

interface GraphEdge {
  key: string;
  from: THREE.Vector3;
  to: THREE.Vector3;
  weight: number;
  curve: THREE.QuadraticBezierCurve3;
  fromId: string;
  toId: string;
}

interface Impulse {
  edgeIndex: number;
  t: number;
  speed: number;
  mesh: THREE.Mesh;
}

const COLORS = {
  bg: 0x070d1a,
  feature: 0xf5a623,
  hidden: 0x3b82f6,
  program: 0x002576,
  programHot: 0x0ea5e9,
  edge: 0x64748b,
  impulse: 0xffffff,
  glow: 0x60a5fa,
};

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function buildLayout(features: GraphFeatureNode[], programs: GraphProgram[]) {
  const feats = features.slice(0, 8);
  const progs = programs.slice(0, 8);
  const hiddenCount = Math.min(5, Math.max(3, Math.ceil((feats.length + progs.length) / 3)));

  const featureNodes: GraphNode[] = feats.map((f, i) => {
    const t = feats.length <= 1 ? 0.5 : i / (feats.length - 1);
    return {
      id: f.id,
      label: f.label,
      kind: 'feature' as const,
      activation: clamp01(f.weight || 0.2),
      position: new THREE.Vector3(-3.2, (t - 0.5) * 3.6, (Math.sin(i * 1.7) * 0.25)),
    };
  });

  const hiddenNodes: GraphNode[] = Array.from({ length: hiddenCount }, (_, i) => {
    const t = hiddenCount <= 1 ? 0.5 : i / (hiddenCount - 1);
    return {
      id: `h-${i}`,
      label: i === Math.floor(hiddenCount / 2) ? 'Twin' : `H${i + 1}`,
      kind: 'hidden' as const,
      activation: 0.45 + (i % 3) * 0.12,
      position: new THREE.Vector3(-0.15 + (i % 2) * 0.2, (t - 0.5) * 2.8, Math.cos(i) * 0.2),
    };
  });

  const programNodes: GraphNode[] = progs.map((p, i) => {
    const t = progs.length <= 1 ? 0.5 : i / (progs.length - 1);
    const affinity = clamp01(p.affinity ?? p.score ?? 0.3);
    return {
      id: p.id || `p-${i}`,
      label: p.name,
      kind: 'program' as const,
      activation: affinity,
      affinity,
      description: p.description,
      position: new THREE.Vector3(3.2, (t - 0.5) * 3.6, Math.sin(i * 1.3) * 0.25),
    };
  });

  const edges: GraphEdge[] = [];

  for (const f of featureNodes) {
    for (const h of hiddenNodes) {
      const weight = clamp01(f.activation * (0.55 + h.activation * 0.45));
      if (weight < 0.18) continue;
      const mid = f.position.clone().lerp(h.position, 0.5);
      mid.z += 0.35 + weight * 0.4;
      mid.y += (h.position.y - f.position.y) * 0.08;
      edges.push({
        key: `${f.id}-${h.id}`,
        from: f.position.clone(),
        to: h.position.clone(),
        weight,
        fromId: f.id,
        toId: h.id,
        curve: new THREE.QuadraticBezierCurve3(f.position.clone(), mid, h.position.clone()),
      });
    }
  }

  for (const h of hiddenNodes) {
    for (const p of programNodes) {
      const weight = clamp01(h.activation * (0.35 + (p.affinity || 0.25)));
      if (weight < 0.16) continue;
      const mid = h.position.clone().lerp(p.position, 0.5);
      mid.z -= 0.3 + weight * 0.35;
      edges.push({
        key: `${h.id}-${p.id}`,
        from: h.position.clone(),
        to: p.position.clone(),
        weight,
        fromId: h.id,
        toId: p.id,
        curve: new THREE.QuadraticBezierCurve3(h.position.clone(), mid, p.position.clone()),
      });
    }
  }

  return { featureNodes, hiddenNodes, programNodes, edges, allNodes: [...featureNodes, ...hiddenNodes, ...programNodes] };
}

function nodeColor(kind: LayerKind, activation: number) {
  if (kind === 'feature') return new THREE.Color(COLORS.feature);
  if (kind === 'hidden') return new THREE.Color(COLORS.hidden).lerp(new THREE.Color(COLORS.glow), activation * 0.35);
  return new THREE.Color(COLORS.program).lerp(new THREE.Color(COLORS.programHot), activation);
}

export function NeuralProgramGraph({ features, programs, className }: NeuralProgramGraphProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{
    label: string;
    affinity?: number;
    description?: string;
    kind: LayerKind;
    activation: number;
  } | null>(null);
  const [ready, setReady] = useState(false);

  const layout = useMemo(() => buildLayout(features, programs), [features, programs]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const width = mount.clientWidth || 640;
    const height = Math.max(360, Math.min(480, Math.round(width * 0.62)));

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(COLORS.bg, 0.045);
    scene.background = new THREE.Color(COLORS.bg);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0.15, 8.2);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = 'auto';
    renderer.domElement.style.display = 'block';
    renderer.domElement.setAttribute('aria-label', 'Red neuronal de afinidad vocacional');

    const ambient = new THREE.AmbientLight(0x9fb4d9, 0.55);
    const key = new THREE.PointLight(0x7dd3fc, 1.4, 30);
    key.position.set(2.5, 3, 5);
    const fill = new THREE.PointLight(0xf5a623, 0.55, 24);
    fill.position.set(-4, -1, 3);
    const rim = new THREE.PointLight(0x60a5fa, 0.8, 20);
    rim.position.set(0, 2, -4);
    scene.add(ambient, key, fill, rim);

    // Soft ground grid for depth
    const grid = new THREE.GridHelper(12, 24, 0x1e3a5f, 0x13233a);
    grid.position.y = -2.4;
    const gridMats = Array.isArray(grid.material) ? grid.material : [grid.material];
    gridMats.forEach((m) => {
      m.transparent = true;
      m.opacity = 0.35;
    });
    scene.add(grid);

    const graphRoot = new THREE.Group();
    const nodeGroup = new THREE.Group();
    const edgeGroup = new THREE.Group();
    const impulseGroup = new THREE.Group();
    const labelGroup = new THREE.Group();
    graphRoot.add(nodeGroup, edgeGroup, impulseGroup, labelGroup);
    scene.add(graphRoot);

    const nodeMeshes = new Map<string, THREE.Mesh>();
    const nodeMeta = new Map<string, GraphNode>();
    const pickables: THREE.Object3D[] = [];

    for (const n of layout.allNodes) {
      const radius = n.kind === 'hidden' ? 0.22 + n.activation * 0.08 : 0.16 + n.activation * 0.14;
      const geo = new THREE.SphereGeometry(radius, 32, 32);
      const color = nodeColor(n.kind, n.activation);
      const mat = new THREE.MeshStandardMaterial({
        color,
        emissive: color.clone().multiplyScalar(0.45),
        emissiveIntensity: 0.35 + n.activation * 0.9,
        roughness: 0.35,
        metalness: 0.25,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(n.position);
      mesh.userData = { id: n.id, kind: n.kind };
      nodeGroup.add(mesh);
      nodeMeshes.set(n.id, mesh);
      nodeMeta.set(n.id, n);
      if (n.kind === 'program' || n.kind === 'feature') pickables.push(mesh);

      // Outer activation ring
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(radius * 1.35, radius * 1.55, 48),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.2 + n.activation * 0.35,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      );
      ring.position.copy(n.position);
      ring.lookAt(camera.position);
      ring.userData = { parentId: n.id, isRing: true };
      nodeGroup.add(ring);
    }

    // Edges as tubes — thickness encodes weight
    const edgeTubes: { mesh: THREE.Mesh; weight: number; edge: GraphEdge }[] = [];
    for (const edge of layout.edges) {
      const tubularSegments = 48;
      const radius = 0.012 + edge.weight * 0.055;
      const geo = new THREE.TubeGeometry(edge.curve, tubularSegments, radius, 8, false);
      const mat = new THREE.MeshStandardMaterial({
        color: COLORS.edge,
        emissive: new THREE.Color(COLORS.glow),
        emissiveIntensity: 0.15 + edge.weight * 0.55,
        transparent: true,
        opacity: 0.28 + edge.weight * 0.55,
        roughness: 0.4,
        metalness: 0.1,
      });
      const mesh = new THREE.Mesh(geo, mat);
      edgeGroup.add(mesh);
      edgeTubes.push({ mesh, weight: edge.weight, edge });
    }

    // Impulses travel along weighted edges
    const impulses: Impulse[] = [];
    if (!reduceMotion && layout.edges.length) {
      const impulseGeo = new THREE.SphereGeometry(0.045, 12, 12);
      const strongEdges = layout.edges
        .map((e, i) => ({ e, i }))
        .sort((a, b) => b.e.weight - a.e.weight)
        .slice(0, Math.min(18, layout.edges.length));

      for (const { e, i } of strongEdges) {
        const count = e.weight > 0.55 ? 2 : 1;
        for (let k = 0; k < count; k++) {
          const mat = new THREE.MeshStandardMaterial({
            color: COLORS.impulse,
            emissive: new THREE.Color(e.weight > 0.5 ? COLORS.feature : COLORS.glow),
            emissiveIntensity: 1.8,
            roughness: 0.2,
            metalness: 0.1,
          });
          const mesh = new THREE.Mesh(impulseGeo, mat);
          const t0 = (k / count + Math.random() * 0.4) % 1;
          mesh.position.copy(e.curve.getPoint(t0));
          impulseGroup.add(mesh);
          impulses.push({
            edgeIndex: i,
            t: t0,
            speed: 0.18 + e.weight * 0.55 + Math.random() * 0.12,
            mesh,
          });
        }
      }
    }

    // HTML labels via CSS2D would need extra deps — use sprite-like canvas textures for key labels
    const labelSprites: THREE.Sprite[] = [];
    function makeLabel(text: string, color = '#e2e8f0') {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, 256, 64);
      ctx.font = '600 22px Inter, system-ui, sans-serif';
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const truncated = text.length > 22 ? `${text.slice(0, 20)}…` : text;
      ctx.fillText(truncated, 128, 32);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false })
      );
      sprite.scale.set(1.35, 0.34, 1);
      return sprite;
    }

    for (const n of layout.allNodes) {
      if (n.kind === 'hidden' && !n.label.startsWith('Twin')) continue;
      const sprite = makeLabel(
        n.label,
        n.kind === 'feature' ? '#fcd34d' : n.kind === 'program' ? '#bfdbfe' : '#ffffff'
      );
      sprite.position.copy(n.position).add(new THREE.Vector3(0, n.kind === 'hidden' ? -0.42 : -0.38, 0));
      labelGroup.add(sprite);
      labelSprites.push(sprite);
    }

    const captions = [
      { text: 'Señales', x: -3.2, color: '#fcd34d' },
      { text: 'Twin', x: 0, color: '#93c5fd' },
      { text: 'Programas', x: 3.2, color: '#bfdbfe' },
    ];
    for (const c of captions) {
      const s = makeLabel(c.text, c.color);
      s.position.set(c.x, 2.35, 0);
      s.scale.set(1.1, 0.28, 1);
      labelGroup.add(s);
      labelSprites.push(s);
    }

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let hoveredId: string | null = null;

    function onPointerMove(event: PointerEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(pickables, false);
      const hit = hits[0]?.object as THREE.Mesh | undefined;
      const id = (hit?.userData?.id as string) || null;
      if (id !== hoveredId) {
        hoveredId = id;
        if (id) {
          const meta = nodeMeta.get(id);
          if (meta) {
            setHover({
              label: meta.label,
              affinity: meta.affinity,
              description: meta.description,
              kind: meta.kind,
              activation: meta.activation,
            });
            renderer.domElement.style.cursor = 'pointer';
          }
        } else {
          setHover(null);
          renderer.domElement.style.cursor = 'default';
        }
      }
    }

    function onPointerLeave() {
      hoveredId = null;
      setHover(null);
      renderer.domElement.style.cursor = 'default';
    }

    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerleave', onPointerLeave);

    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    const animate = () => {
      if (disposed) return;
      frameId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;

      if (!reduceMotion) {
        graphRoot.rotation.y = Math.sin(t * 0.15) * 0.06;

        for (const [id, mesh] of nodeMeshes) {
          const meta = nodeMeta.get(id)!;
          const mat = mesh.material as THREE.MeshStandardMaterial;
          const pulse = 0.85 + Math.sin(t * (1.2 + meta.activation) + meta.activation * 4) * 0.15;
          const boost = hoveredId === id ? 1.35 : 1;
          mat.emissiveIntensity = (0.35 + meta.activation * 0.9) * pulse * boost;
          const s = 1 + Math.sin(t * 2 + meta.activation * 3) * 0.03 * meta.activation;
          mesh.scale.setScalar(s * (hoveredId === id ? 1.12 : 1));
        }

        for (const child of nodeGroup.children) {
          if (child.userData?.isRing) {
            child.quaternion.copy(camera.quaternion);
          }
        }

        for (const tube of edgeTubes) {
          const mat = tube.mesh.material as THREE.MeshStandardMaterial;
          mat.emissiveIntensity = 0.15 + tube.weight * 0.55 + Math.sin(t * 2 + tube.weight * 5) * 0.08;
        }

        for (const impulse of impulses) {
          const edge = layout.edges[impulse.edgeIndex];
          if (!edge) continue;
          impulse.t = (impulse.t + impulse.speed * dt) % 1;
          impulse.mesh.position.copy(edge.curve.getPoint(impulse.t));
          const mat = impulse.mesh.material as THREE.MeshStandardMaterial;
          mat.emissiveIntensity = 1.4 + Math.sin(impulse.t * Math.PI * 2) * 0.5;
          impulse.mesh.scale.setScalar(0.7 + edge.weight * 0.8);
        }
      }

      renderer.render(scene, camera);
    };

    animate();
    setReady(true);

    const onResize = () => {
      if (!mount) return;
      const w = mount.clientWidth || width;
      const h = Math.max(360, Math.min(480, Math.round(w * 0.62)));
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerleave', onPointerLeave);
      setHover(null);
      setReady(false);

      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          const mat = obj.material;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else mat.dispose();
        }
        if (obj instanceof THREE.Sprite) {
          const mat = obj.material;
          mat.map?.dispose();
          mat.dispose();
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentElement === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [layout]);

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-outline-variant/20 bg-[#070d1a]',
        className
      )}
    >
      <div ref={mountRef} className="min-h-[360px] w-full" />

      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">
          Cargando red neuronal…
        </div>
      )}

      <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-2 text-[10px] font-medium uppercase tracking-wide text-slate-300/90">
        <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-amber-200">Señales</span>
        <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-sky-200">Activación</span>
        <span className="rounded-full bg-blue-900/50 px-2 py-0.5 text-blue-100">Peso = grosor</span>
      </div>

      <div
        ref={tooltipRef}
        className={cn(
          'pointer-events-none absolute bottom-3 left-3 right-3 rounded-xl border border-white/10 bg-slate-950/90 p-3 text-sm shadow-lg backdrop-blur transition-opacity duration-150',
          hover ? 'opacity-100' : 'opacity-0'
        )}
        aria-live="polite"
      >
        {hover && (
          <>
            <p className="font-semibold text-sky-200">{hover.label}</p>
            <p className="text-xs text-slate-400">
              {hover.kind === 'program'
                ? `Afinidad ${Math.round((hover.affinity || 0) * 100)}%`
                : `Activación ${Math.round(hover.activation * 100)}%`}
              {' · '}
              {hover.kind === 'feature' ? 'Señal de entrada' : hover.kind === 'hidden' ? 'Capa Twin' : 'Programa'}
            </p>
            {hover.description && (
              <p className="mt-1 line-clamp-2 text-xs text-slate-300">{hover.description}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
