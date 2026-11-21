/* Hairline Isometric Kernel (TypeScript port) */

export interface RingPoint {
  u: number;
  v: number;
  nu: number;
  nv: number;
}

export interface Camera {
  az: number;
  k: number;
  S: number;
  ox: number;
  oy: number;
}

export type Pt2 = [number, number];
export type Pt3 = [number, number, number];
export type Projector = (x: number, y: number, z: number) => Pt2;

export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const rad = (d: number): number => (d * Math.PI) / 180;
export const r2 = (n: number): number => Math.round(n * 100) / 100;

export const poly = (pts: Pt2[]): string =>
  'M' + pts.map(p => `${r2(p[0])} ${r2(p[1])}`).join('L') + 'Z';

export const seg = (a: Pt2, b: Pt2): string =>
  `M${r2(a[0])} ${r2(a[1])}L${r2(b[0])} ${r2(b[1])}`;

export const openPoly = (pts: Pt2[]): string =>
  pts.length < 2 ? '' : 'M' + pts.map(p => `${r2(p[0])} ${r2(p[1])}`).join('L');

export const Cam = (azDeg: number, k: number, S: number): Camera => ({
  az: rad(azDeg),
  k,
  S,
  ox: 0,
  oy: 0,
});

export function proj(C: Camera): Projector {
  const c = Math.cos(C.az);
  const s = Math.sin(C.az);
  const zf = Math.sqrt(1 - C.k * C.k);
  return (x: number, y: number, z: number): Pt2 => {
    const X = x * c - y * s;
    const Y = x * s + y * c;
    return [C.ox + C.S * X, C.oy + C.S * (Y * C.k - z * zf)];
  };
}

export function fit(C: Camera, pts: Pt3[], cx: number, cy: number): void {
  C.ox = 0;
  C.oy = 0;
  const P = proj(C);
  let a = 1e9;
  let b = -1e9;
  let c = 1e9;
  let d = -1e9;
  for (const p of pts) {
    const q = P(p[0], p[1], p[2]);
    a = Math.min(a, q[0]);
    b = Math.max(b, q[0]);
    c = Math.min(c, q[1]);
    d = Math.max(d, q[1]);
  }
  C.ox = cx - (a + b) / 2;
  C.oy = cy - (c + d) / 2;
}

export function rrect(u0: number, v0: number, u1: number, v1: number, r: number, n = 4): RingPoint[] {
  const radClamped = Math.max(0, Math.min(r, (u1 - u0) / 2, (v1 - v0) / 2));
  const out: RingPoint[] = [];
  const corners: Array<[number, number, number]> = [
    [u1 - radClamped, v1 - radClamped, 0],
    [u0 + radClamped, v1 - radClamped, 90],
    [u0 + radClamped, v0 + radClamped, 180],
    [u1 - radClamped, v0 + radClamped, 270],
  ];
  for (const [cu, cv, a0] of corners) {
    for (let k = 0; k <= n; k++) {
      const a = rad(a0 + (90 * k) / n);
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      out.push({ u: cu + radClamped * ca, v: cv + radClamped * sa, nu: ca, nv: sa });
    }
  }
  return out;
}

export function circ(R: number, n = 96): RingPoint[] {
  const out: RingPoint[] = [];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    out.push({ u: R * ca, v: R * sa, nu: ca, nv: sa });
  }
  return out;
}

export function hull(input: Pt2[]): Pt2[] {
  const pts = input.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const x = (o: Pt2, a: Pt2, b: Pt2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo: Pt2[] = [];
  const up: Pt2[] = [];
  for (const p of pts) {
    while (lo.length > 1 && x(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop();
    lo.push(p);
  }
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (up.length > 1 && x(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop();
    up.push(p);
  }
  lo.pop();
  up.pop();
  return lo.concat(up);
}

export const ringAt = (P: Projector, ring: RingPoint[], z: number): Pt2[] =>
  ring.map(q => P(q.u, q.v, z));

export const facing = (C: Camera): ((q: RingPoint) => boolean) => {
  const s = Math.sin(C.az);
  const c = Math.cos(C.az);
  return q => q.nu * s + q.nv * c >= -1e-6;
};

export function run(ring: RingPoint[], keep: (q: RingPoint) => boolean): RingPoint[] {
  const n = ring.length;
  let s = -1;
  for (let i = 0; i < n; i++) {
    if (keep(ring[i]) && !keep(ring[(i + n - 1) % n])) {
      s = i;
      break;
    }
  }
  if (s < 0) return keep(ring[0]) ? ring.slice() : [];
  const out: RingPoint[] = [];
  for (let k = 0; k < n && keep(ring[(s + k) % n]); k++) {
    out.push(ring[(s + k) % n]);
  }
  return out;
}

export function prism(
  P: Projector,
  front: (q: RingPoint) => boolean,
  ring: RingPoint[],
  inner: RingPoint[] | null,
  z0: number,
  z1: number
): { sil: string; crease: string } {
  return {
    sil: poly(hull(ringAt(P, ring, z1).concat(ringAt(P, ring, z0)))),
    crease: inner ? openPoly(ringAt(P, run(inner, front), z1)) : '',
  };
}

export const rings = (
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  r: number,
  b: number
): [RingPoint[], RingPoint[]] => [
  rrect(x0, y0, x1, y1, r),
  rrect(x0 + b, y0 + b, x1 - b, y1 - b, Math.max(0.3, r - b)),
];

export const shiftRing = (ring: RingPoint[], dx: number, dy: number): RingPoint[] =>
  ring.map(q => ({ u: q.u + dx, v: q.v + dy, nu: q.nu, nv: q.nv }));

export function turnedRing(ring: RingPoint[], cx: number, cy: number, aDeg: number): RingPoint[] {
  const c = Math.cos(rad(aDeg));
  const s = Math.sin(rad(aDeg));
  return ring.map(q => ({
    u: cx + q.u * c - q.v * s,
    v: cy + q.u * s + q.v * c,
    nu: q.nu * c - q.nv * s,
    nv: q.nu * s + q.nv * c,
  }));
}

export const disc = (cx: number, cy: number, r: number, b: number, n = 14): [RingPoint[], RingPoint[]] => [
  rrect(cx - r, cy - r, cx + r, cy + r, r, n),
  rrect(cx - r + b, cy - r + b, cx + r - b, cy + r - b, r - b, n),
];

/* ── motion: springs & tweens ── */
export interface Spring {
  x: number;
  v: number;
  t: number;
  k: number;
  c: number;
  m: number;
  eps: number;
}

export function spring(x: number, o: Partial<Spring> = {}): Spring {
  return {
    x,
    v: 0,
    t: x,
    k: o.k ?? 100,
    c: o.c ?? 18,
    m: o.m ?? 1,
    eps: o.eps ?? 0.01,
  };
}

export function stepS(sp: Spring, dt: number, reduced = false): boolean {
  if (reduced) {
    sp.x = sp.t;
    sp.v = 0;
    return false;
  }
  const n = Math.max(1, Math.ceil(dt * 240));
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    const a = (-sp.k * (sp.x - sp.t) - sp.c * sp.v) / sp.m;
    sp.v += a * h;
    sp.x += sp.v * h;
  }
  if (Math.abs(sp.x - sp.t) < sp.eps && Math.abs(sp.v) < sp.eps * 10) {
    sp.x = sp.t;
    sp.v = 0;
    return false;
  }
  return true;
}

function bezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const X = (u: number) => ((ax * u + bx) * u + cx) * u;
  const Y = (u: number) => ((ay * u + by) * u + cy) * u;
  const dX = (u: number) => (3 * ax * u + 2 * bx) * u + cx;
  return (t: number) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    let u = t;
    for (let i = 0; i < 8; i++) {
      const e = X(u) - t;
      if (Math.abs(e) < 1e-5) break;
      const d = dX(u);
      if (Math.abs(d) < 1e-6) break;
      u -= e / d;
    }
    if (!(u >= 0 && u <= 1) || Math.abs(X(u) - t) > 1e-4) {
      let lo = 0;
      let hi = 1;
      u = t;
      for (let i = 0; i < 24; i++) {
        if (X(u) < t) lo = u;
        else hi = u;
        u = (lo + hi) / 2;
      }
    }
    return Y(u);
  };
}

export const EASE_LIFT = bezier(0.32, 0.72, 0, 1);

export interface Tween {
  from: number;
  to: number;
  t0: number;
  dur: number;
}

export const tween = (v: number, dur = 700): Tween => ({ from: v, to: v, t0: -1e9, dur });

export const tval = (tw: Tween, now: number, reduced = false): number => {
  const p = clamp((now - tw.t0) / tw.dur, 0, 1);
  return tw.from + (tw.to - tw.from) * (reduced ? 1 : EASE_LIFT(p));
};

export const tset = (tw: Tween, to: number, now: number, delay: number, reduced = false): void => {
  if (tw.to === to) return;
  tw.from = tval(tw, now, reduced);
  tw.to = to;
  tw.t0 = now + delay;
};

export const tdone = (tw: Tween, now: number, reduced = false): boolean =>
  reduced || now >= tw.t0 + tw.dur;

/* ── SVG element helpers ── */
const NS = 'http://www.w3.org/2000/svg';

export function mk<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs?: Record<string, string | number>,
  parent?: Element | null
): SVGElementTagNameMap[K] {
  const e = document.createElementNS(NS, tag);
  if (attrs) {
    for (const k of Object.keys(attrs)) {
      e.setAttribute(k, String(attrs[k]));
    }
  }
  if (parent) parent.appendChild(e);
  return e;
}

export interface SolidNode {
  g: SVGGElement;
  sil: SVGPathElement;
  cr: SVGPathElement;
}

export function solid(parent: Element): SolidNode {
  const g = mk('g', {}, parent);
  return {
    g,
    sil: mk('path', { class: 'sil' }, g),
    cr: mk('path', { class: 'nf lo' }, g),
  };
}

export const put = (el: SolidNode, s: { sil: string; crease: string }): void => {
  el.sil.setAttribute('d', s.sil);
  el.cr.setAttribute('d', s.crease);
};

export const flatDot = (parent: Element, C: Camera, r: number, cls: string): SVGEllipseElement =>
  mk('ellipse', { rx: r2(r * C.S), ry: r2(r * C.S * C.k), class: cls }, parent);

export const place = (el: Element, q: Pt2): void => {
  el.setAttribute('cx', String(r2(q[0])));
  el.setAttribute('cy', String(r2(q[1])));
};
