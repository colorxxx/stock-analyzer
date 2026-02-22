"use client";

import { useState } from "react";

interface AnalysisPanelProps {
  ticker: string;
  selectedFrom: string | null;
  selectedTo: string | null;
  priceData: { time: string; close: number; high: number; low: number; volume: number }[];
  indicators: unknown;
  quote: unknown;
}

export default function AnalysisPanel({
  ticker,
  selectedFrom,
  selectedTo,
  priceData,
  indicators,
  quote,
}: AnalysisPanelProps) {
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);

  const hasSelection = selectedFrom && selectedTo;

  async function runAnalysis() {
    if (!hasSelection) return;
    setLoading(true);
    setAnalysis("");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker,
          from: selectedFrom,
          to: selectedTo,
          priceData,
          indicators,
          quote,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        setAnalysis(error.error || "분석에 실패했습니다. 다시 시도해주세요.");
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
      setAnalysis("연결 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-dark-900 rounded-xl border border-dark-700 p-4">
      <h3 className="text-sm font-semibold text-dark-300 mb-3">AI 구간 분석</h3>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {hasSelection ? (
          <span className="text-sm text-dark-200">
            📅 {selectedFrom} ~ {selectedTo}
          </span>
        ) : (
          <span className="text-sm text-dark-400">
            차트에서 &quot;구간 선택&quot; 버튼을 눌러 분석할 구간을 선택하세요
          </span>
        )}
        <button
          onClick={runAnalysis}
          disabled={loading || !hasSelection}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 ml-auto"
        >
          {loading ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              분석 중...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              구간 분석
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
