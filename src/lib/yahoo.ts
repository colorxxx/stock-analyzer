/* eslint-disable @typescript-eslint/no-explicit-any */

export interface StockQuote {
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
}

export interface HistoricalBar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Use raw Yahoo Finance API via fetch to avoid yahoo-finance2 compatibility issues
const BASE = "https://query1.finance.yahoo.com";

async function yahooFetch(url: string) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });
  if (!res.ok) throw new Error(`Yahoo API error: ${res.status}`);
  return res.json();
}

export async function getStockQuote(ticker: string): Promise<StockQuote> {
  const data = await yahooFetch(
    `${BASE}/v7/finance/quote?symbols=${encodeURIComponent(ticker)}`
  );
  const q = data?.quoteResponse?.result?.[0];
  if (!q) throw new Error(`No quote data for ${ticker}`);
  return {
    symbol: q.symbol,
    shortName: q.shortName || q.symbol,
    longName: q.longName || q.shortName || q.symbol,
    regularMarketPrice: q.regularMarketPrice || 0,
    regularMarketChange: q.regularMarketChange || 0,
    regularMarketChangePercent: q.regularMarketChangePercent || 0,
    regularMarketVolume: q.regularMarketVolume || 0,
    marketCap: q.marketCap || 0,
    fiftyTwoWeekHigh: q.fiftyTwoWeekHigh || 0,
    fiftyTwoWeekLow: q.fiftyTwoWeekLow || 0,
    trailingPE: q.trailingPE ?? null,
    forwardPE: q.forwardPE ?? null,
    dividendYield: q.trailingAnnualDividendYield ?? null,
    regularMarketOpen: q.regularMarketOpen || 0,
    regularMarketDayHigh: q.regularMarketDayHigh || 0,
    regularMarketDayLow: q.regularMarketDayLow || 0,
    regularMarketPreviousClose: q.regularMarketPreviousClose || 0,
    averageVolume: q.averageDailyVolume3Month || 0,
  };
}

export async function getHistoricalData(
  ticker: string,
  period1: string | Date,
  period2?: string | Date,
  interval: "1d" | "1wk" | "1mo" = "1d"
): Promise<HistoricalBar[]> {
  const p1 = Math.floor(new Date(period1).getTime() / 1000);
  const p2 = Math.floor((period2 ? new Date(period2).getTime() : Date.now()) / 1000);
  
  const data = await yahooFetch(
    `${BASE}/v8/finance/chart/${encodeURIComponent(ticker)}?period1=${p1}&period2=${p2}&interval=${interval}`
  );
  
  const result = data?.chart?.result?.[0];
  if (!result) throw new Error(`No historical data for ${ticker}`);
  
  const timestamps = result.timestamp || [];
  const ohlcv = result.indicators?.quote?.[0] || {};
  
  return timestamps
    .map((ts: number, i: number) => {
      const o = ohlcv.open?.[i];
      const h = ohlcv.high?.[i];
      const l = ohlcv.low?.[i];
      const c = ohlcv.close?.[i];
      const v = ohlcv.volume?.[i];
      if (o == null || h == null || l == null || c == null) return null;
      return {
        time: new Date(ts * 1000).toISOString().split("T")[0],
        open: Math.round(o * 100) / 100,
        high: Math.round(h * 100) / 100,
        low: Math.round(l * 100) / 100,
        close: Math.round(c * 100) / 100,
        volume: v || 0,
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => a.time.localeCompare(b.time));
}

export async function searchTickers(query: string) {
  const data = await yahooFetch(
    `${BASE}/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0`
  );
  return (data?.quotes || [])
    .filter((q: any) => q.quoteType === "EQUITY" && q.isYahooFinance)
    .slice(0, 8)
    .map((q: any) => ({
      symbol: q.symbol,
      name: q.shortname || q.symbol,
      exchange: q.exchange || "",
    }));
}
