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

// Yahoo Finance requires crumb+cookie auth
let cachedCrumb: string | null = null;
let cachedCookie: string | null = null;
let crumbExpiry = 0;

async function getCrumb(): Promise<{ crumb: string; cookie: string }> {
  if (cachedCrumb && cachedCookie && Date.now() < crumbExpiry) {
    return { crumb: cachedCrumb, cookie: cachedCookie };
  }

  // Step 1: Get cookie from Yahoo Finance page
  const initRes = await fetch("https://fc.yahoo.com", {
    redirect: "manual",
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });

  const setCookies = initRes.headers.getSetCookie?.() || [];
  const cookieStr = setCookies.map((c: string) => c.split(";")[0]).join("; ");

  if (!cookieStr) {
    throw new Error("Failed to get Yahoo cookie");
  }

  // Step 2: Get crumb using the cookie
  const crumbRes = await fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Cookie: cookieStr,
    },
  });

  if (!crumbRes.ok) {
    throw new Error(`Failed to get crumb: ${crumbRes.status}`);
  }

  const crumb = await crumbRes.text();

  cachedCrumb = crumb;
  cachedCookie = cookieStr;
  crumbExpiry = Date.now() + 5 * 60 * 1000; // 5 min cache

  return { crumb, cookie: cookieStr };
}

async function yahooFetch(url: string) {
  const { crumb, cookie } = await getCrumb();
  const separator = url.includes("?") ? "&" : "?";
  const fullUrl = `${url}${separator}crumb=${encodeURIComponent(crumb)}`;

  const res = await fetch(fullUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Cookie: cookie,
    },
  });

  if (!res.ok) {
    // If 401/403, invalidate cache and retry once
    if (res.status === 401 || res.status === 403) {
      cachedCrumb = null;
      cachedCookie = null;
      crumbExpiry = 0;
      const retry = await getCrumb();
      const retryUrl = `${url}${separator}crumb=${encodeURIComponent(retry.crumb)}`;
      const retryRes = await fetch(retryUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Cookie: retry.cookie,
        },
      });
      if (!retryRes.ok) throw new Error(`Yahoo API error: ${retryRes.status}`);
      return retryRes.json();
    }
    throw new Error(`Yahoo API error: ${res.status}`);
  }
  return res.json();
}

export async function getStockQuote(ticker: string): Promise<StockQuote> {
  const data = await yahooFetch(
    `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(ticker)}`
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
    `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?period1=${p1}&period2=${p2}&interval=${interval}`
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
    `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0`
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
