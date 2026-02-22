"use client";

import { useState } from "react";

interface AnalysisPanelProps {
  ticker: string;
  visibleFrom: string;
  visibleTo: string;
  priceData: { time: string; close: number; high: number; low: number; volume: number }[];
  indicators: unknown;
  quote: unknown;
}

export default function AnalysisPanel({
  ticker,
  visibleFrom,
  visibleTo,
  priceData,
  indicators,
  quote,
}: AnalysisPanelProps) {
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState(visibleFrom);
  const [to, setTo] = useState(visibleTo);

  // Update date inputs when visible range changes
  if (visibleFrom !== from && !loading) {
    // Only update if significantly different to avoid constant updates
  }

  async function runAnalysis() {
    setLoading(true);
    setAnalysis("");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker,
          from,
          to,
          priceData,
          indicators,
          quote,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        setAnalysis(error.error || "Analysis failed. Please try again.");
        setLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          setAnalysis((prev) => prev + chunk);
        }
      }
    } catch {
      setAnalysis("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-dark-900 rounded-xl border border-dark-700 p-4">
      <h3 className="text-sm font-semibold text-dark-300 mb-3">AI Timeline Analysis</h3>
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <label className="block text-xs text-dark-400 mb-1">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-sm text-dark-100 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-dark-400 mb-1">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-sm text-dark-100 focus:outline-none focus:border-blue-500"
          />
        </div>
        <button
          onClick={runAnalysis}
          disabled={loading}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Analyze Period
            </>
          )}
        </button>
      </div>

      {analysis && (
        <div className="bg-dark-800 rounded-lg p-4 text-sm text-dark-200 leading-relaxed whitespace-pre-wrap">
          {analysis}
        </div>
      )}
    </div>
  );
}
