import { useMemo } from 'react';

export type SparklineVariant = 'line' | 'bar' | 'area';

export interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  variant?: SparklineVariant;
  /** 'up' = green when trending up; 'down' = green when trending down */
  positiveDirection?: 'up' | 'down';
  showMinMax?: boolean;
  showCurrentValue?: boolean;
  className?: string;
}

function linearRegression(data: number[]): number {
  const n = data.length;
  if (n < 2) return 0;
  const sumX = (n * (n - 1)) / 2;
  const sumY = data.reduce((a, b) => a + b, 0);
  const sumXY = data.reduce((acc, y, x) => acc + x * y, 0);
  const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
  return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
}

export function Sparkline({
  data,
  width = 60,
  height = 20,
  variant = 'line',
  positiveDirection = 'up',
  showMinMax = false,
  showCurrentValue = false,
  className = '',
}: SparklineProps) {
  const { points, polyline, areaPath, minIdx, maxIdx, color, barRects } =
    useMemo(() => {
      if (data.length === 0) {
        return {
          points: [],
          polyline: '',
          areaPath: '',
          minIdx: 0,
          maxIdx: 0,
          color: '#4ade80',
          barRects: [],
        };
      }

      const min = Math.min(...data);
      const max = Math.max(...data);
      const range = max - min || 1;
      const padding = 2;
      const w = width - padding * 2;
      const h = height - padding * 2;

      const pts = data.map((v, i) => ({
        x: padding + (i / (data.length - 1 || 1)) * w,
        y: padding + h - ((v - min) / range) * h,
      }));

      const slope = linearRegression(data);
      const trendingUp = slope > 0;
      const isPositive =
        positiveDirection === 'up' ? trendingUp : !trendingUp;
      const clr = isPositive ? '#4ade80' : '#f87171';

      const poly = pts.map((p) => `${p.x},${p.y}`).join(' ');

      // Area path
      const area =
        pts.length > 0
          ? `M${pts[0].x},${padding + h} ` +
            pts.map((p) => `L${p.x},${p.y}`).join(' ') +
            ` L${pts[pts.length - 1].x},${padding + h} Z`
          : '';

      // Bar rects
      const barW = Math.max(1, w / data.length - 1);
      const rects = data.map((v, i) => {
        const barH = ((v - min) / range) * h;
        return {
          x: padding + (i / data.length) * w,
          y: padding + h - barH,
          width: barW,
          height: Math.max(1, barH),
        };
      });

      let mnIdx = 0;
      let mxIdx = 0;
      data.forEach((v, i) => {
        if (v < data[mnIdx]) mnIdx = i;
        if (v > data[mxIdx]) mxIdx = i;
      });

      return {
        points: pts,
        polyline: poly,
        areaPath: area,
        minIdx: mnIdx,
        maxIdx: mxIdx,
        color: clr,
        barRects: rects,
      };
    }, [data, width, height, positiveDirection]);

  if (data.length === 0) {
    return (
      <svg
        width={width}
        height={height}
        className={`inline-block ${className}`}
        aria-hidden="true"
      />
    );
  }

  return (
    <svg
      width={width}
      height={height}
      className={`inline-block align-middle ${className}`}
      aria-label={`Sparkline: ${data.length} datapunkter`}
      role="img"
    >
      {variant === 'bar' &&
        barRects.map((r, i) => (
          <rect
            key={i}
            x={r.x}
            y={r.y}
            width={r.width}
            height={r.height}
            fill={color}
            opacity={0.7}
          />
        ))}

      {variant === 'area' && (
        <path d={areaPath} fill={color} opacity={0.15} />
      )}

      {(variant === 'line' || variant === 'area') && (
        <polyline
          points={polyline}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {showMinMax && points.length > 1 && (
        <>
          <circle
            cx={points[minIdx].x}
            cy={points[minIdx].y}
            r={2}
            fill="#f87171"
          />
          <circle
            cx={points[maxIdx].x}
            cy={points[maxIdx].y}
            r={2}
            fill="#4ade80"
          />
        </>
      )}

      {showCurrentValue && points.length > 0 && (
        <circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r={2}
          fill={color}
        />
      )}
    </svg>
  );
}
export default Sparkline;
