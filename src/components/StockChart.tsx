"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import {
  createChart,
  ColorType,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type HistogramData,
  type LineData,
  type Time,
} from "lightweight-charts";

interface ChartProps {
  data: CandlestickData<Time>[];
  volumeData: HistogramData<Time>[];
  sma20?: LineData<Time>[];
  sma50?: LineData<Time>[];
  sma200?: LineData<Time>[];
  onRangeChange?: (from: string, to: string) => void;
  onSelectionChange?: (from: string | null, to: string | null) => void;
  height?: number;
}

export default function StockChart({
  data,
  volumeData,
  sma20,
  sma50,
  sma200,
  onRangeChange,
  onSelectionChange,
}: ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const highlightSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const [showMA, setShowMA] = useState({ sma20: true, sma50: true, sma200: false });
  const [selectMode, setSelectMode] = useState(false);
  const [selStart, setSelStart] = useState<string | null>(null);
  const [selEnd, setSelEnd] = useState<string | null>(null);
  const clickCountRef = useRef(0);

  // Responsive height
  const getChartHeight = useCallback(() => {
    if (typeof window === "undefined") return 400;
    return window.innerWidth < 640 ? 300 : window.innerWidth < 1024 ? 380 : 500;
  }, []);

  // Update highlight overlay
  const updateHighlight = useCallback(
    (chart: IChartApi, start: string | null, end: string | null) => {
      if (highlightSeriesRef.current) {
        try {
          chart.removeSeries(highlightSeriesRef.current);
        } catch {
          // ignore
        }
        highlightSeriesRef.current = null;
      }
      if (!start || !end || !data.length) return;

      const [s, e] = start <= end ? [start, end] : [end, start];

      const highlightData: HistogramData<Time>[] = data
        .filter((d) => {
          const t = d.time as string;
          return t >= s && t <= e;
        })
        .map((d) => ({
          time: d.time,
          value: d.high * 1.001,
          color: "rgba(59,130,246,0.12)",
        }));

      if (highlightData.length === 0) return;

      const series = chart.addHistogramSeries({
        priceScaleId: "right",
        priceFormat: { type: "price" },
        lastValueVisible: false,
        priceLineVisible: false,
      });
      series.setData(highlightData);
      highlightSeriesRef.current = series;
    },
    [data]
  );

  const initChart = useCallback(() => {
    if (!containerRef.current) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      highlightSeriesRef.current = null;
    }

    const chartHeight = getChartHeight();

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: chartHeight,
      layout: {
        background: { type: ColorType.Solid, color: "#1a1a2e" },
        textColor: "#8e8ea0",
        fontSize: 12,
      },
      grid: {
        vertLines: { color: "#2a2a3e" },
        horzLines: { color: "#2a2a3e" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "#565869", width: 1, style: 2 },
        horzLine: { color: "#565869", width: 1, style: 2 },
      },
      rightPriceScale: {
        borderColor: "#2a2a3e",
        scaleMargins: { top: 0.1, bottom: 0.25 },
      },
      timeScale: {
        borderColor: "#2a2a3e",
        timeVisible: false,
      },
      handleScroll: {
        vertTouchDrag: false,
      },
      handleScale: {
        axisPressedMouseMove: {
          time: true,
          price: true,
        },
      },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderDownColor: "#ef4444",
      borderUpColor: "#22c55e",
      wickDownColor: "#ef4444",
      wickUpColor: "#22c55e",
    });
    candleSeries.setData(data);

    const volumeSeries = chart.addHistogramSeries({
      color: "#3b82f6",
      priceFormat: { type: "volume" },
      priceScaleId: "",
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });
    volumeSeries.setData(volumeData);

    if (showMA.sma20 && sma20?.length) {
      const ma20Series = chart.addLineSeries({
        color: "#f59e0b",
        lineWidth: 1,
        title: "SMA 20",
      });
      ma20Series.setData(sma20);
    }
    if (showMA.sma50 && sma50?.length) {
      const ma50Series = chart.addLineSeries({
        color: "#8b5cf6",
        lineWidth: 1,
        title: "SMA 50",
      });
      ma50Series.setData(sma50);
    }
    if (showMA.sma200 && sma200?.length) {
      const ma200Series = chart.addLineSeries({
        color: "#ec4899",
        lineWidth: 1,
        title: "SMA 200",
      });
      ma200Series.setData(sma200);
    }

    chart.timeScale().fitContent();
    chartRef.current = chart;

    // Restore highlight if selection exists
    if (selStart && selEnd) {
      updateHighlight(chart, selStart, selEnd);
    }

    chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
      if (!onRangeChange) return;
      const timeRange = chart.timeScale().getVisibleRange();
      if (timeRange) {
        onRangeChange(timeRange.from as string, timeRange.to as string);
      }
    });
  }, [data, volumeData, sma20, sma50, sma200, showMA, getChartHeight, onRangeChange, selStart, selEnd, updateHighlight]);

  // Handle chart click for selection
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !selectMode) return;

    const handler = (param: { time?: Time }) => {
      if (!param.time) return;
      const timeStr = param.time as string;
      const clicks = clickCountRef.current;

      if (clicks === 0) {
        setSelStart(timeStr);
        setSelEnd(null);
        clickCountRef.current = 1;
        onSelectionChange?.(timeStr, null);
      } else {
        const start = selStart!;
        const [s, e] = start <= timeStr ? [start, timeStr] : [timeStr, start];
        setSelStart(s);
        setSelEnd(e);
        clickCountRef.current = 0;
        setSelectMode(false);
        onSelectionChange?.(s, e);
        updateHighlight(chart, s, e);
      }
    };

    chart.subscribeClick(handler);
    return () => {
      chart.unsubscribeClick(handler);
    };
  }, [selectMode, selStart, onSelectionChange, updateHighlight]);

  useEffect(() => {
    initChart();

    const handleResize = () => {
      if (chartRef.current && containerRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
          height: getChartHeight(),
        });
      }
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        highlightSeriesRef.current = null;
      }
    };
  }, [initChart, getChartHeight]);

  const handleToggleSelect = () => {
    if (selectMode) {
      setSelectMode(false);
    } else {
      setSelectMode(true);
      setSelStart(null);
      setSelEnd(null);
      clickCountRef.current = 0;
      onSelectionChange?.(null, null);
      if (chartRef.current) {
        updateHighlight(chartRef.current, null, null);
      }
    }
  };

  return (
    <div className="bg-dark-900 rounded-xl border border-dark-700 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-dark-700">
        <button
          onClick={handleToggleSelect}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            selectMode
              ? "bg-blue-600 text-white"
              : "bg-dark-700 text-dark-300 hover:bg-dark-600 hover:text-dark-200"
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8M8 12h8m-4-9v18" />
          </svg>
          {selectMode
            ? selStart && !selEnd
              ? "종료일을 클릭하세요"
              : "시작일을 클릭하세요"
            : "구간 선택"}
        </button>
        <div className="flex items-center gap-3">
          {(["sma20", "sma50", "sma200"] as const).map((key) => (
            <label key={key} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showMA[key]}
                onChange={() => setShowMA((prev) => ({ ...prev, [key]: !prev[key] }))}
                className="sr-only"
              />
              <div
                className={`w-3 h-3 rounded-sm border ${
                  showMA[key]
                    ? key === "sma20"
                      ? "bg-amber-500 border-amber-500"
                      : key === "sma50"
                      ? "bg-violet-500 border-violet-500"
                      : "bg-pink-500 border-pink-500"
                    : "border-dark-500"
                }`}
              />
              <span className="text-xs text-dark-400">{key.toUpperCase()}</span>
            </label>
          ))}
        </div>
      </div>
      <div ref={containerRef} className={`touch-pan-y ${selectMode ? "cursor-crosshair" : ""}`} />
    </div>
  );
}
