"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
}

export default function SearchBar({ size = "large" }: { size?: "large" | "small" }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback(async (q: string) => {
    if (q.length < 1) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/stock/${encodeURIComponent(q)}?action=search`);
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function navigate(symbol: string) {
    setShowResults(false);
    setQuery("");
    router.push(`/stock/${symbol}`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ticker = query.trim().toUpperCase();
    if (ticker) navigate(ticker);
  }

  const isLarge = size === "large";

  return (
    <div ref={ref} className={`relative ${isLarge ? "w-full max-w-2xl" : "w-72"}`}>
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <svg
            className={`absolute left-4 top-1/2 -translate-y-1/2 text-dark-400 ${isLarge ? "w-5 h-5" : "w-4 h-4"}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowResults(true);
            }}
            onFocus={() => setShowResults(true)}
            placeholder="Search stock ticker (e.g. AAPL, TSLA, CLS)"
            className={`w-full bg-dark-800 border border-dark-600 rounded-xl text-dark-100 placeholder-dark-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors ${
              isLarge ? "pl-12 pr-4 py-4 text-lg" : "pl-10 pr-4 py-2.5 text-sm"
            }`}
          />
          {loading && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-dark-400 border-t-blue-500 rounded-full animate-spin" />
            </div>
          )}
        </div>
      </form>

      {showResults && results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-dark-800 border border-dark-600 rounded-xl shadow-2xl overflow-hidden">
          {results.map((r) => (
            <button
              key={r.symbol}
              onClick={() => navigate(r.symbol)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-dark-700 transition-colors text-left"
            >
              <div>
                <span className="font-semibold text-dark-100">{r.symbol}</span>
                <span className="ml-2 text-sm text-dark-400">{r.name}</span>
              </div>
              <span className="text-xs text-dark-500">{r.exchange}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
