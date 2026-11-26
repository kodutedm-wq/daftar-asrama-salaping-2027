import React, {useMemo, useState} from 'react';
import {HostelApplication, TINGKATAN_OPTIONS} from '../types/hostel';

interface DashboardAnalyticsChartProps {
  applications: HostelApplication[];
}

export const DashboardAnalyticsChart: React.FC<DashboardAnalyticsChartProps> = ({
  applications,
}) => {
  const [mode, setMode] = useState<'tingkatan' | 'status'>('tingkatan');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const series = useMemo(() => {
    if (mode === 'tingkatan') {
      return TINGKATAN_OPTIONS.map((t, i) => ({
        label: `T${i + 1}`,
        fullLabel: t,
        value: applications.filter((a) => a.tkt === t).length,
      }));
    }
    const statuses: Array<{
      label: string;
      fullLabel: string;
      key: HostelApplication['status'];
    }> = [
      {label: 'Hantar', fullLabel: 'Dihantar', key: 'Dihantar'},
      {label: 'Semak', fullLabel: 'Disemak', key: 'Disemak'},
      {label: 'Lulus', fullLabel: 'Diluluskan', key: 'Diluluskan'},
      {label: 'Tolak', fullLabel: 'Ditolak', key: 'Ditolak'},
    ];
    return statuses.map((s) => ({
      label: s.label,
      fullLabel: s.fullLabel,
      value: applications.filter((a) => a.status === s.key).length,
    }));
  }, [applications, mode]);

  const approvedCount = applications.filter(
    (a) => a.status === 'Diluluskan',
  ).length;
  const approvalRate =
    applications.length > 0
      ? Math.round((approvedCount / applications.length) * 100)
      : 0;

  const maxVal = Math.max(2, ...series.map((s) => s.value));
  const width = 320;
  const height = 128;
  const padLeft = 26;
  const padRight = 14;
  const padTop = 14;
  const padBottom = 22;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const points = series.map((item, idx) => {
    const x =
      series.length > 1
        ? padLeft + (idx / (series.length - 1)) * plotW
        : padLeft + plotW / 2;
    const y = padTop + plotH - (item.value / maxVal) * plotH;
    return {...item, x, y};
  });

  // Smooth cubic bezier path
  const linePath = useMemo(() => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cx = ((p0.x + p1.x) / 2).toFixed(1);
      d += ` C ${cx} ${p0.y.toFixed(1)}, ${cx} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
    }
    return d;
  }, [points]);

  const areaPath = useMemo(() => {
    if (points.length === 0) return '';
    const baseY = (padTop + plotH).toFixed(1);
    const firstX = points[0].x.toFixed(1);
    const lastX = points[points.length - 1].x.toFixed(1);
    return `${linePath} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;
  }, [linePath, points, padTop, plotH]);

  const activeIndex =
    hoveredIdx !== null
      ? hoveredIdx
      : points.reduce(
          (bestIdx, p, idx, arr) =>
            p.value > arr[bestIdx].value ? idx : bestIdx,
          0,
        );
  const activePoint = points[activeIndex];

  return (
    <div className="rounded-2xl border border-[#ece9f6] bg-white p-4 shadow-xs dark:border-[#2a273d] dark:bg-[#1b1929]">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-sm font-bold text-[#1d1b2e] dark:text-[#f2f0fa]">
          Statistik Permohonan
        </h3>
        <select
          aria-label="Mod statistik carta"
          value={mode}
          onChange={(e) =>
            setMode(e.target.value === 'status' ? 'status' : 'tingkatan')
          }
          className="min-h-[38px] rounded-lg border border-[#e5e2f2] bg-[#f7f6fc] px-2.5 py-1 text-base font-semibold text-[#1d1b2e] focus:border-[#6c3cf0] focus:outline-none sm:min-h-[32px] sm:text-xs dark:border-[#2e2a45] dark:bg-[#13111f] dark:text-[#f2f0fa]"
        >
          <option value="tingkatan">Tingkatan</option>
          <option value="status">Status</option>
        </select>
      </div>

      <div className="mt-3 rounded-xl bg-[#faf9fe] p-3 dark:bg-[#141221]">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-[#5e5a77] dark:text-[#a8a4c2]">
            {activePoint
              ? `${activePoint.fullLabel}: ${activePoint.value} rekod`
              : 'Taburan rekod'}
          </span>
          <span className="font-mono-num font-bold text-[#1d1b2e] dark:text-[#f2f0fa]">
            {approvalRate}% Diluluskan
          </span>
        </div>

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="mt-2 h-32 w-full overflow-visible"
          role="img"
          aria-label="Carta taburan permohonan asrama"
        >
          <defs>
            <linearGradient id="coralAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F47A52" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#F47A52" stopOpacity="0.03" />
            </linearGradient>
          </defs>

          {/* Horizontal dashed guides */}
          {[0, 0.5, 1].map((frac) => {
            const y = padTop + plotH * (1 - frac);
            const labelVal = Math.round(maxVal * frac);
            return (
              <g key={frac}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="currentColor"
                  className="text-[#e6e3f2] dark:text-[#2a273d]"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 6}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-[#7d7996] font-mono text-[9px] dark:fill-[#8f8aad]"
                >
                  {labelVal}
                </text>
              </g>
            );
          })}

          {/* Area & Spline */}
          {areaPath && <path d={areaPath} fill="url(#coralAreaGrad)" />}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="#E7683E"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          )}

          {/* Active vertical guide */}
          {activePoint && (
            <line
              x1={activePoint.x}
              y1={activePoint.y}
              x2={activePoint.x}
              y2={padTop + plotH}
              stroke="#E7683E"
              strokeDasharray="2.5 2.5"
              strokeWidth="1.2"
              opacity="0.7"
            />
          )}

          {/* Interactive nodes + X labels */}
          {points.map((pt, idx) => {
            const isActive = idx === activeIndex;
            return (
              <g
                key={pt.label}
                tabIndex={0}
                role="button"
                aria-label={`${pt.fullLabel}: ${pt.value} rekod`}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => setHoveredIdx(idx)}
                onTouchStart={() => setHoveredIdx(idx)}
                onFocus={() => setHoveredIdx(idx)}
                className="cursor-pointer outline-none"
              >
                <circle cx={pt.x} cy={pt.y} r="18" fill="transparent" />
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isActive ? 4.5 : 2.8}
                  fill={isActive ? '#FFFFFF' : '#E7683E'}
                  stroke="#E7683E"
                  strokeWidth={isActive ? 2.4 : 0}
                />
                <text
                  x={pt.x}
                  y={height - 4}
                  textAnchor="middle"
                  className={`text-[9.5px] font-medium ${
                    isActive
                      ? 'fill-[#1d1b2e] font-bold dark:fill-[#f2f0fa]'
                      : 'fill-[#7d7996] dark:fill-[#8f8aad]'
                  }`}
                >
                  {pt.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
