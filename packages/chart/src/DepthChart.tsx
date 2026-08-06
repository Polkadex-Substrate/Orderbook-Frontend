"use client";
import { useEffect, useRef } from "react";

import { ChartTheme, DARK_THEME, DepthLevel } from "./types";

export type DepthChartProps = {
  /** Best-first: bids descending by price, asks ascending. Non-cumulative qty. */
  bids: DepthLevel[];
  asks: DepthLevel[];
  theme?: ChartTheme;
  height?: number;
  /** Fill the parent's height instead of using the fixed `height`. */
  fill?: boolean;
};

/** Classic cumulative depth chart on a PRICE x-axis (lightweight-charts is
 *  time-indexed, so this is a small self-contained canvas renderer). */
export function DepthChart({
  bids,
  asks,
  theme = DARK_THEME,
  height = 160,
  fill = false,
}: DepthChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = wrap.clientWidth;
      const h = fill ? wrap.clientHeight : height;
      if (w === 0 || h === 0) return;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = theme.background;
      ctx.fillRect(0, 0, w, h);

      if (!bids.length && !asks.length) {
        ctx.fillStyle = theme.text;
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("No depth", w / 2, h / 2);
        return;
      }

      // Cumulative volumes, best-first.
      const cum = (levels: DepthLevel[]) => {
        let acc = 0;
        return levels.map(([p, q]) => {
          acc += q;
          return [p, acc] as DepthLevel;
        });
      };
      const cumBids = cum(bids);
      const cumAsks = cum(asks);

      const bestBid = bids[0]?.[0];
      const bestAsk = asks[0]?.[0];
      const mid =
        bestBid !== undefined && bestAsk !== undefined
          ? (bestBid + bestAsk) / 2
          : (bestBid ?? bestAsk)!;

      const minP = cumBids.length ? cumBids[cumBids.length - 1][0] : mid;
      const maxP = cumAsks.length ? cumAsks[cumAsks.length - 1][0] : mid;
      const span = Math.max(maxP - minP, mid * 1e-6, 1e-12);
      const maxV = Math.max(
        cumBids[cumBids.length - 1]?.[1] ?? 0,
        cumAsks[cumAsks.length - 1]?.[1] ?? 0
      );
      const x = (p: number) => ((p - minP) / span) * w;
      const y = (v: number) => h - (v / maxV) * (h - 18);

      const side = (
        levels: DepthLevel[],
        stroke: string,
        fill: string,
        anchorX: number
      ) => {
        if (!levels.length) return;
        ctx.beginPath();
        ctx.moveTo(anchorX, y(0));
        // Step outline: horizontal to each level's price, then vertical.
        let prevY = y(0);
        for (const [p, v] of levels) {
          const px = x(p);
          ctx.lineTo(px, prevY);
          prevY = y(v);
          ctx.lineTo(px, prevY);
        }
        const lastX = x(levels[levels.length - 1][0]);
        ctx.lineTo(lastX, prevY);
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.lineTo(lastX, y(0));
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
      };

      side(cumBids, theme.up, `${theme.up}33`, x(mid));
      side(cumAsks, theme.down, `${theme.down}33`, x(mid));

      // Mid line + label
      ctx.strokeStyle = theme.text;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x(mid), 14);
      ctx.lineTo(x(mid), h);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = theme.text;
      ctx.font = "11px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`mid ${mid.toPrecision(6)}`, x(mid), 11);
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [bids, asks, theme, height, fill]);

  return (
    <div
      ref={wrapRef}
      className="w-full"
      style={fill ? { height: "100%" } : { height }}
    >
      <canvas ref={canvasRef} />
    </div>
  );
}
