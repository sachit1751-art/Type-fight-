import React, { useEffect, useRef, useState } from 'react';
import {
  Cam,
  clamp,
  facing,
  fit,
  mk,
  prism,
  proj,
  put,
  rad,
  rings,
  rrect,
  seg,
  solid,
  tdone,
  tset,
  tval,
  tween,
  disc,
  turnedRing,
  flatDot,
  place,
} from '../defense/kernel';

const PADS: Array<[number, number]> = [
  [-6, 60],
  [28, 60],
  [62, 60],
];
const REST = [5, 12, 3];
const LOW = 0;
const AIM = [-22, 8, 40];
const AIM_REST = [-40, 18, 30];

export const MenuKeepFigure: React.FC = () => {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [readout, setReadout] = useState('rest');

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const svg = mk('svg', { viewBox: '0 0 400 320', 'aria-hidden': 'true' }, stage);
    const C = Cam(45, 0.5, 1.72);
    fit(
      C,
      [
        [-26, -18, -6],
        [92, 84, -6],
        [92, -18, -6],
        [-26, 84, -6],
        [36, 12, 70],
        [62, 60, 44],
      ],
      200,
      162
    );
    const P = proj(C);
    const front = facing(C);
    const g = mk('g', {}, svg);

    const [br, bi] = rings(-26, -18, 92, 84, 12, 2.2);
    put(solid(g), prism(P, front, br, bi, -6, 0));
    const [pr, pi] = rings(12, -10, 60, 34, 8, 1.6);
    put(solid(g), prism(P, front, pr, pi, 0, 8));

    const tower = disc(36, 12, 15, 1.8);
    put(solid(g), prism(P, front, tower[0], tower[1], 8, 58));

    const onFace = (a: number, z0: number, z1: number) => {
      const x = 36 + 15 * Math.cos(rad(a));
      const y = 12 + 15 * Math.sin(rad(a));
      return [P(x, y, z0), P(x, y, z1)];
    };

    const slits: Array<[number, number, number, string]> = [
      [60, 10, 24, 'nf'],
      [52, 10, 22, 'nf lo'],
      [68, 10, 22, 'nf lo'],
      [38, 34, 42, 'nf lo'],
      [82, 34, 42, 'nf lo'],
    ];
    for (const [a, z0, z1, cls] of slits) {
      const [p0, p1] = onFace(a, z0, z1);
      mk('path', { d: seg(p0, p1), class: cls }, g);
    }

    const crown = disc(36, 12, 18, 2);
    const crownS = solid(g);
    put(crownS, prism(P, front, crown[0], crown[1], 58, 66));

    const merl = [0, 45, 90, 135, 180, 225, 270, 315]
      .map(a => [36 + 15 * Math.cos(rad(a)), 12 + 15 * Math.sin(rad(a))] as [number, number])
      .sort((a, b) => a[0] + a[1] - (b[0] + b[1]));
    for (const [x, y] of merl) {
      const [mr, mi] = rings(x - 2.6, y - 2.6, x + 2.6, y + 2.6, 1.2, 0.6);
      put(solid(g), prism(P, front, mr, mi, 66, 70));
    }

    const turrets = PADS.map(([cx, cy], i) => {
      const grp = mk('g', {}, g);
      const [r0, r1] = rings(cx - 11, cy - 11, cx + 11, cy + 11, 4, 1);
      put(solid(grp), prism(P, front, r0, r1, 0, 1.6));
      const dots: SVGEllipseElement[] = [];
      for (let k = 0; k <= i; k++) {
        const d = flatDot(grp, C, 1.2, 'dot off');
        place(d, P(cx - 3.5 * i + 7 * k, cy + 16, 0));
        dots.push(d);
      }
      return {
        cx,
        cy,
        i,
        base: solid(grp),
        drum: solid(grp),
        barrel: solid(grp),
        cap: solid(grp),
        dots,
        h: tween(REST[i]),
        a: tween(AIM_REST[i]),
      };
    });

    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const draw = (t: (typeof turrets)[number], h: number, a: number) => {
      const z0 = 1.6;
      const z1 = z0 + 3 + h;
      const z2 = z1 + 7;
      const [b0, b1] = disc(t.cx, t.cy, 8, 1.2, 10);
      put(t.base, prism(P, front, b0, b1, z0, z1));
      const [d0, d1] = disc(t.cx, t.cy, 5.6, 1, 10);
      put(t.drum, prism(P, front, d0, d1, z1, z2));
      const bar = rrect(0, -1.6, 15, 1.6, 1.4, 3);
      const bin = rrect(0.6, -1, 14.4, 1, 0.8, 3);
      put(
        t.barrel,
        prism(
          P,
          front,
          turnedRing(bar, t.cx, t.cy, a),
          turnedRing(bin, t.cx, t.cy, a),
          z1 + 2.2,
          z1 + 5.4
        )
      );
      const [c0, c1] = disc(t.cx, t.cy, 3.4, 0.8, 8);
      put(t.cap, prism(P, front, c0, c1, z2, z2 + 1.6));
    };

    const centres = PADS.map(([cx, cy]) => P(cx, cy, 0));
    const hit = (x: number, y: number) => {
      let best = -1;
      let bd = 1e9;
      centres.forEach((c, i) => {
        const d = Math.abs(x - c[0]);
        if (d < bd && y > c[1] - 90 && y < c[1] + 26) {
          bd = d;
          best = i;
        }
      });
      return bd < 34 ? best : -1;
    };

    let act = -2;
    let rafId = 0;
    const renderFrame = () => {
      const now = performance.now();
      let moving = false;
      for (const t of turrets) {
        draw(t, tval(t.h, now, reduceMotion), tval(t.a, now, reduceMotion));
        if (!tdone(t.h, now, reduceMotion) || !tdone(t.a, now, reduceMotion)) {
          moving = true;
        }
      }
      if (moving) {
        rafId = window.requestAnimationFrame(renderFrame);
      } else {
        rafId = 0;
      }
    };

    const wake = () => {
      if (!rafId) rafId = window.requestAnimationFrame(renderFrame);
    };

    const setActive = (a: number) => {
      if (a === act) return;
      const now = performance.now();
      const from = a >= 0 ? a : Math.max(act, 1);
      act = a;
      turrets.forEach((t, i) => {
        const delay = Math.abs(i - from) * 45;
        tset(t.h, a < 0 ? REST[i] : i === a ? 28 : LOW, now, delay, reduceMotion);
        tset(t.a, a < 0 ? AIM_REST[i] : i === a ? AIM[i] : AIM_REST[i] - 20, now, delay, reduceMotion);
        const on = i === a;
        [t.base, t.drum, t.barrel, t.cap].forEach(s => s.sil.classList.toggle('hi', on));
        t.dots.forEach(d => d.setAttribute('class', 'dot ' + (on ? '' : a < 0 ? 'off' : 'm')));
      });
      crownS.sil.classList.toggle('hi', a < 0);
      setReadout(a < 0 ? 'rest' : `pad ${a + 1}`);
      wake();
    };

    setActive(-1);
    renderFrame();

    // Gentle auto-tour across the 3 turret pads when idle
    let tourStep = 0;
    let hoverLocked = false;
    const tourTimer = window.setInterval(() => {
      if (hoverLocked || reduceMotion) return;
      const stops = [0, 1, 2, -1];
      setActive(stops[tourStep % stops.length]);
      tourStep++;
    }, 1600);

    const onMove = (e: PointerEvent) => {
      hoverLocked = true;
      const r = stage.getBoundingClientRect();
      const x = clamp(((e.clientX - r.left) / r.width) * 400, 0, 400);
      const y = clamp(((e.clientY - r.top) / r.height) * 320, 0, 320);
      setActive(hit(x, y));
    };

    const onLeave = () => {
      hoverLocked = false;
      setActive(-1);
    };

    stage.addEventListener('pointermove', onMove);
    stage.addEventListener('pointerleave', onLeave);

    return () => {
      window.clearInterval(tourTimer);
      if (rafId) window.cancelAnimationFrame(rafId);
      stage.removeEventListener('pointermove', onMove);
      stage.removeEventListener('pointerleave', onLeave);
      svg.remove();
    };
  }, []);

  return (
    <div className="menu-fig">
      <div
        ref={stageRef}
        className="hl-svg-stage"
        data-hairline="keep"
        role="img"
        aria-label="A keep with three turret pads: the pad under the pointer raises its turret to the field."
      />
      <span className="mono fig-read">{readout}</span>
    </div>
  );
};
