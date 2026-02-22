"use client";

import SearchBar from "@/components/SearchBar";
import { useRouter } from "next/navigation";

const POPULAR_TICKERS = [
  { symbol: "AAPL", name: "Apple" },
  { symbol: "TSLA", name: "Tesla" },
  { symbol: "MSFT", name: "Microsoft" },
  { symbol: "GOOGL", name: "Alphabet" },
  { symbol: "AMZN", name: "Amazon" },
  { symbol: "NVDA", name: "NVIDIA" },
  { symbol: "META", name: "Meta" },
  { symbol: "CLS", name: "Celestica" },
];

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-2xl text-center mb-8">
        <h1 className="text-4xl font-bold text-dark-100 mb-2">
          Stock Analyzer
        </h1>
        <p className="text-dark-400 text-lg">
          AI-powered stock analysis with interactive charts
        </p>
      </div>

      <SearchBar size="large" />

      <div className="mt-8 flex flex-wrap justify-center gap-2">
        {POPULAR_TICKERS.map((t) => (
          <button
            key={t.symbol}
            onClick={() => router.push(`/stock/${t.symbol}`)}
            className="px-4 py-2 bg-dark-800 border border-dark-700 rounded-lg text-sm hover:bg-dark-700 hover:border-dark-500 transition-colors"
          >
            <span className="font-semibold text-dark-200">{t.symbol}</span>
            <span className="ml-1.5 text-dark-500">{t.name}</span>
          </button>
        ))}
      </div>

      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl w-full">
        <div className="text-center px-4">
          <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-blue-600/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-dark-200 mb-1">Interactive Charts</h3>
          <p className="text-xs text-dark-500">Candlestick charts with volume, moving averages, and technical overlays</p>
        </div>
        <div className="text-center px-4">
          <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-green-600/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-dark-200 mb-1">Technical Analysis</h3>
          <p className="text-xs text-dark-500">RSI, MACD, SMA/EMA with AI-powered period analysis</p>
        </div>
        <div className="text-center px-4">
          <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-purple-600/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-dark-200 mb-1">AI Chat</h3>
          <p className="text-xs text-dark-500">Ask questions about any stock and get intelligent analysis</p>
        </div>
      </div>
    </div>
  );
}
