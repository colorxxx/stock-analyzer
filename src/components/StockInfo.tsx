"use client";

interface StockInfoProps {
  quote: {
    regularMarketOpen: number;
    regularMarketDayHigh: number;
    regularMarketDayLow: number;
    regularMarketPreviousClose: number;
    regularMarketVolume: number;
    averageVolume: number;
    marketCap: number;
    trailingPE: number | null;
    forwardPE: number | null;
    fiftyTwoWeekHigh: number;
    fiftyTwoWeekLow: number;
    dividendYield: number | null;
  };
  indicators?: {
    rsi: { time: string; value: number }[];
    macd: {
      macd: { time: string; value: number }[];
      signal: { time: string; value: number }[];
      histogram: { time: string; value: number }[];
    };
  };
}

function formatNumber(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toLocaleString()}`;
}

function formatVolume(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString();
}

function InfoCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-dark-800 rounded-lg px-4 py-3">
      <div className="text-xs text-dark-400 mb-1">{label}</div>
      <div className="text-sm font-semibold text-dark-100">{value}</div>
      {sub && <div className="text-xs text-dark-500 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function StockInfo({ quote, indicators }: StockInfoProps) {
  const latestRSI = indicators?.rsi?.slice(-1)[0]?.value;
  const latestMACD = indicators?.macd?.macd?.slice(-1)[0]?.value;
  const latestSignal = indicators?.macd?.signal?.slice(-1)[0]?.value;
  const macdHistogram = indicators?.macd?.histogram?.slice(-1)[0]?.value;

  const rsiSignal =
    latestRSI !== undefined
      ? latestRSI > 70
        ? "Overbought"
        : latestRSI < 30
        ? "Oversold"
        : "Neutral"
      : undefined;

  const macdSignal =
    latestMACD !== undefined && latestSignal !== undefined
      ? latestMACD > latestSignal
        ? "Bullish"
        : "Bearish"
      : undefined;

  return (
    <div className="space-y-4">
      {/* Key Stats */}
      <div>
        <h3 className="text-sm font-semibold text-dark-300 mb-2 px-1">Key Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <InfoCard label="Open" value={`$${quote.regularMarketOpen.toFixed(2)}`} />
          <InfoCard label="Day High" value={`$${quote.regularMarketDayHigh.toFixed(2)}`} />
          <InfoCard label="Day Low" value={`$${quote.regularMarketDayLow.toFixed(2)}`} />
          <InfoCard label="Prev Close" value={`$${quote.regularMarketPreviousClose.toFixed(2)}`} />
          <InfoCard label="Volume" value={formatVolume(quote.regularMarketVolume)} sub={`Avg: ${formatVolume(quote.averageVolume)}`} />
          <InfoCard label="Market Cap" value={formatNumber(quote.marketCap)} />
          <InfoCard label="P/E (TTM)" value={quote.trailingPE ? quote.trailingPE.toFixed(2) : "N/A"} sub={quote.forwardPE ? `Fwd: ${quote.forwardPE.toFixed(2)}` : undefined} />
          <InfoCard label="52W Range" value={`$${quote.fiftyTwoWeekLow.toFixed(2)} - $${quote.fiftyTwoWeekHigh.toFixed(2)}`} />
        </div>
      </div>

      {/* Technical Indicators */}
      {indicators && (
        <div>
          <h3 className="text-sm font-semibold text-dark-300 mb-2 px-1">Technical Indicators</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="bg-dark-800 rounded-lg px-4 py-3">
              <div className="text-xs text-dark-400 mb-1">RSI (14)</div>
              <div className="text-sm font-semibold text-dark-100">
                {latestRSI?.toFixed(2) ?? "N/A"}
              </div>
              {rsiSignal && (
                <div
                  className={`text-xs mt-0.5 font-medium ${
                    rsiSignal === "Overbought"
                      ? "text-red-400"
                      : rsiSignal === "Oversold"
                      ? "text-green-400"
                      : "text-dark-400"
                  }`}
                >
                  {rsiSignal}
                </div>
              )}
            </div>
            <div className="bg-dark-800 rounded-lg px-4 py-3">
              <div className="text-xs text-dark-400 mb-1">MACD</div>
              <div className="text-sm font-semibold text-dark-100">
                {latestMACD?.toFixed(3) ?? "N/A"}
              </div>
              {macdSignal && (
                <div
                  className={`text-xs mt-0.5 font-medium ${
                    macdSignal === "Bullish" ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {macdSignal}
                </div>
              )}
            </div>
            <InfoCard
              label="MACD Signal"
              value={latestSignal?.toFixed(3) ?? "N/A"}
            />
            <div className="bg-dark-800 rounded-lg px-4 py-3">
              <div className="text-xs text-dark-400 mb-1">MACD Histogram</div>
              <div
                className={`text-sm font-semibold ${
                  macdHistogram !== undefined
                    ? macdHistogram >= 0
                      ? "text-green-400"
                      : "text-red-400"
                    : "text-dark-100"
                }`}
              >
                {macdHistogram?.toFixed(3) ?? "N/A"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
