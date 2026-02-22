"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import type { CandlestickData, HistogramData, LineData, Time } from "lightweight-charts";
import StockChart from "@/components/StockChart";
import ChatPanel from "@/components/ChatPanel";
import StockInfo from "@/components/StockInfo";
import AnalysisPanel from "@/components/AnalysisPanel";
import SearchBar from "@/components/SearchBar";

interface StockData {
  quote: {
    symbol: string;
    shortName: string;
    longName: string;
    regularMarketPrice: number;
    regularMarketChange: number;
    regularMarketChangePercent: number;
    regularMarketVolume: number;
    marketCap: number;
    fiftyTwoWeekHigh: number;
    fiftyTwoWeekLow: number;
    trailingPE: number | null;
    forwardPE: number | null;
    dividendYield: number | null;
    regularMarketOpen: number;
    regularMarketDayHigh: number;
    regularMarketDayLow: number;
    regularMarketPreviousClose: number;
    averageVolume: number;
  };
  historical: {
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }[];
  indicators: {
    rsi: { time: string; value: number }[];
    macd: {
      macd: { time: string; value: number }[];
      signal: { time: string; value: number }[];
      histogram: { time: string; value: number }[];
    };
    sma20: { time: string; value: number }[];
    sma50: { time: string; value: number }[];
    sma200: { time: string; value: number }[];
    ema12: { time: string; value: number }[];
    ema26: { time: string; value: number }[];
  };
}

export default function StockPage() {
  const params = useParams();
  const router = useRouter();
  const ticker = (params.ticker as string).toUpperCase();

  const [data, setData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState("1y");
  const [visibleRange, setVisibleRange] = useState({ from: "", to: "" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/stock/${ticker}?range=${range}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to fetch stock data");
      }
      const json = await res.json();
      setData(json);

      // Set initial visible range
      if (json.historical.length > 0) {
        setVisibleRange({
          from: json.historical[0].time,
          to: json.historical[json.historical.length - 1].time,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [ticker, range]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRangeChange = useCallback((from: string, to: string) => {
    setVisibleRange({ from, to });
  }, []);

  // Prepare chart data
  const candlestickData: CandlestickData<Time>[] = (data?.historical || []).map((bar) => ({
    time: bar.time as Time,
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
  }));

  const volumeData: HistogramData<Time>[] = (data?.historical || []).map((bar) => ({
    time: bar.time as Time,
    value: bar.volume,
    color: bar.close >= bar.open ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)",
  }));

  const sma20: LineData<Time>[] = (data?.indicators?.sma20 || []).map((d) => ({
    time: d.time as Time,
    value: d.value,
  }));

  const sma50: LineData<Time>[] = (data?.indicators?.sma50 || []).map((d) => ({
    time: d.time as Time,
    value: d.value,
  }));

  const sma200: LineData<Time>[] = (data?.indicators?.sma200 || []).map((d) => ({
    time: d.time as Time,
    value: d.value,
  }));

  // Build stock context for chat
  const stockContext = data
    ? `Stock: ${data.quote.symbol} (${data.quote.longName})
Price: $${data.quote.regularMarketPrice.toFixed(2)} (${data.quote.regularMarketChange >= 0 ? "+" : ""}${data.quote.regularMarketChange.toFixed(2)}, ${data.quote.regularMarketChangePercent >= 0 ? "+" : ""}${data.quote.regularMarketChangePercent.toFixed(2)}%)
Market Cap: $${(data.quote.marketCap / 1e9).toFixed(2)}B
P/E (TTM): ${data.quote.trailingPE?.toFixed(2) ?? "N/A"}
52W Range: $${data.quote.fiftyTwoWeekLow.toFixed(2)} - $${data.quote.fiftyTwoWeekHigh.toFixed(2)}
RSI (14): ${data.indicators.rsi.slice(-1)[0]?.value?.toFixed(2) ?? "N/A"}
MACD: ${data.indicators.macd.macd.slice(-1)[0]?.value?.toFixed(3) ?? "N/A"} / Signal: ${data.indicators.macd.signal.slice(-1)[0]?.value?.toFixed(3) ?? "N/A"}`
    : undefined;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-dark-600 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-dark-400">Loading {ticker} data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-dark-200 mb-2">Error Loading Stock</h2>
          <p className="text-dark-400 mb-4">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-dark-700 text-dark-200 rounded-lg hover:bg-dark-600 transition-colors text-sm"
          >
            Back to Search
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const isPositive = data.quote.regularMarketChange >= 0;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-dark-800 px-4 py-3">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push("/")}
            className="text-lg font-bold text-dark-200 hover:text-dark-100 transition-colors"
          >
            Stock Analyzer
          </button>
          <SearchBar size="small" />
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-[1800px] mx-auto w-full">
        {/* Left: Chart + Info */}
        <div className="flex-1 min-w-0 p-3 sm:p-4 space-y-4">
          {/* Stock header */}
          <div className="flex items-baseline gap-3">
            <h1 className="text-2xl font-bold text-dark-100">{data.quote.symbol}</h1>
            <span className="text-dark-400">{data.quote.longName}</span>
          </div>
          <div className="flex items-baseline gap-3 mb-4">
            <span className="text-3xl font-bold text-dark-100">
              ${data.quote.regularMarketPrice.toFixed(2)}
            </span>
            <span className={`text-lg font-semibold ${isPositive ? "text-green-400" : "text-red-400"}`}>
              {isPositive ? "+" : ""}{data.quote.regularMarketChange.toFixed(2)}
              {" "}({isPositive ? "+" : ""}{data.quote.regularMarketChangePercent.toFixed(2)}%)
            </span>
          </div>

          {/* Range buttons that actually fetch new data */}
          <div className="flex gap-1">
            {["1m", "3m", "6m", "1y", "2y", "5y"].map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  range === r
                    ? "bg-blue-600 text-white"
                    : "text-dark-400 hover:text-dark-200 hover:bg-dark-700"
                }`}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Chart */}
          <StockChart
            data={candlestickData}
            volumeData={volumeData}
            sma20={sma20}
            sma50={sma50}
            sma200={sma200}
            onRangeChange={handleRangeChange}
          />

          {/* Analysis Panel */}
          <AnalysisPanel
            ticker={ticker}
            visibleFrom={visibleRange.from}
            visibleTo={visibleRange.to}
            priceData={data.historical}
            indicators={data.indicators}
            quote={data.quote}
          />

          {/* Stock Info */}
          <StockInfo quote={data.quote} indicators={data.indicators} />
        </div>

        {/* Right: Chat Panel */}
        <div className="w-full lg:w-[380px] flex-shrink-0 lg:border-l border-t lg:border-t-0 border-dark-800 p-3 sm:p-4">
          <div className="lg:sticky lg:top-4 lg:h-[calc(100vh-88px)] h-[400px]">
            <ChatPanel ticker={ticker} stockContext={stockContext} />
          </div>
        </div>
      </div>
    </div>
  );
}
