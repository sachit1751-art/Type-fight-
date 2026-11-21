import React, { useEffect, useMemo, useRef } from 'react';
import * as d3 from 'd3';
import { WpmPoint } from '../game/types';

interface WpmTrendChartProps {
  samples: WpmPoint[];
  finalWpm: number;
}

export const WpmTrendChart: React.FC<WpmTrendChartProps> = ({ samples, finalWpm }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const normalized = useMemo<WpmPoint[]>(() => {
    if (samples.length >= 2) return samples;
    if (samples.length === 1) {
      return [
        { t: 0, wpm: 0 },
        { t: Math.max(1, samples[0].t), wpm: samples[0].wpm },
      ];
    }
    return [
      { t: 0, wpm: 0 },
      { t: 3, wpm: finalWpm },
    ];
  }, [samples, finalWpm]);

  const stats = useMemo(() => {
    const wpms = normalized.map(d => d.wpm);
    const peak = Math.max(0, ...wpms, finalWpm);
    const avg = wpms.length ? Math.round(d3.mean(wpms) ?? finalWpm) : finalWpm;
    return { peak, avg };
  }, [normalized, finalWpm]);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const W = 440;
    const H = 96;
    const margin = { top: 10, right: 12, bottom: 20, left: 32 };
    const innerW = W - margin.left - margin.right;
    const innerH = H - margin.top - margin.bottom;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const maxT = Math.max(3, d3.max(normalized, d => d.t) ?? 3);
    const maxWpm = Math.max(20, Math.ceil(((d3.max(normalized, d => d.wpm) ?? 40) * 1.15) / 10) * 10);

    const x = d3.scaleLinear().domain([0, maxT]).range([0, innerW]);
    const y = d3.scaleLinear().domain([0, maxWpm]).range([innerH, 0]);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Subtle hairline horizontal gridlines
    const yTicks = y.ticks(3);
    g.selectAll('.wpm-grid')
      .data(yTicks)
      .join('line')
      .attr('class', 'wpm-grid')
      .attr('x1', 0)
      .attr('x2', innerW)
      .attr('y1', d => y(d))
      .attr('y2', d => y(d));

    // Average WPM dashed reference line
    if (stats.avg > 0) {
      g.append('line')
        .attr('class', 'wpm-avg-line')
        .attr('x1', 0)
        .attr('x2', innerW)
        .attr('y1', y(stats.avg))
        .attr('y2', y(stats.avg));
    }

    // Subtle area fill under the hairline curve
    const areaGen = d3
      .area<WpmPoint>()
      .x(d => x(d.t))
      .y0(innerH)
      .y1(d => y(d.wpm))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(normalized)
      .attr('class', 'wpm-area')
      .attr('d', areaGen);

    // Primary WPM hairline curve
    const lineGen = d3
      .line<WpmPoint>()
      .x(d => x(d.t))
      .y(d => y(d.wpm))
      .curve(d3.curveMonotoneX);

    const path = g
      .append('path')
      .datum(normalized)
      .attr('class', 'wpm-line')
      .attr('d', lineGen);

    const pathNode = path.node();
    if (pathNode && typeof pathNode.getTotalLength === 'function') {
      const len = pathNode.getTotalLength();
      const reduceMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!reduceMotion && len > 0) {
        path
          .attr('stroke-dasharray', `${len} ${len}`)
          .attr('stroke-dashoffset', len)
          .transition()
          .duration(520)
          .ease(d3.easeCubicOut)
          .attr('stroke-dashoffset', 0);
      }
    }

    // Peak WPM dot marker
    const peakPoint = normalized.reduce(
      (best, pt) => (pt.wpm >= best.wpm ? pt : best),
      normalized[0]
    );
    if (peakPoint) {
      g.append('circle')
        .attr('class', 'wpm-peak-dot')
        .attr('cx', x(peakPoint.t))
        .attr('cy', y(peakPoint.wpm))
        .attr('r', 3);
    }

    // X & Y hairline axes
    const xAxis = d3
      .axisBottom(x)
      .ticks(4)
      .tickSize(3)
      .tickFormat(d => `${Math.round(Number(d))}s`);

    const yAxis = d3
      .axisLeft(y)
      .tickValues(yTicks)
      .tickSize(3)
      .tickFormat(d => `${Math.round(Number(d))}`);

    g.append('g')
      .attr('class', 'wpm-axis')
      .attr('transform', `translate(0,${innerH})`)
      .call(xAxis);

    g.append('g')
      .attr('class', 'wpm-axis')
      .call(yAxis);
  }, [normalized, stats.avg]);

  return (
    <div className="wpm-chart-card" aria-label="Speed trend graph in words per minute">
      <div className="wpm-chart-head">
        <span className="cap">WPM Trend · D3</span>
        <span className="wpm-chart-meta mono">
          peak {stats.peak} · avg {stats.avg} · end {finalWpm} wpm
        </span>
      </div>
      <svg
        ref={svgRef}
        className="wpm-chart-svg"
        viewBox="0 0 440 96"
        role="img"
        aria-label={`WPM trend graph showing peak ${stats.peak} WPM and average ${stats.avg} WPM`}
      />
    </div>
  );
};
