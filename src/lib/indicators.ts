export interface OHLCData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorResult {
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
}

function sma(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      const slice = data.slice(i - period + 1, i + 1);
      result.push(slice.reduce((a, b) => a + b, 0) / period);
    }
  }
  return result;
}

function ema(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const multiplier = 2 / (period + 1);

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else if (i === period - 1) {
      const initial = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
      result.push(initial);
    } else {
      const prev = result[i - 1]!;
      result.push(data[i] * multiplier + prev * (1 - multiplier));
    }
  }
  return result;
}

export function calculateRSI(data: OHLCData[], period: number = 14): { time: string; value: number }[] {
  const closes = data.map((d) => d.close);
  const changes: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }

  const result: { time: string; value: number }[] = [];
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < changes.length; i++) {
    if (i < period) {
      avgGain += Math.max(changes[i], 0);
      avgLoss += Math.abs(Math.min(changes[i], 0));
      if (i === period - 1) {
        avgGain /= period;
        avgLoss /= period;
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        const rsi = 100 - 100 / (1 + rs);
        result.push({ time: data[i + 1].time, value: Math.round(rsi * 100) / 100 });
      }
    } else {
      const gain = Math.max(changes[i], 0);
      const loss = Math.abs(Math.min(changes[i], 0));
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      const rsi = 100 - 100 / (1 + rs);
      result.push({ time: data[i + 1].time, value: Math.round(rsi * 100) / 100 });
    }
  }

  return result;
}

export function calculateMACD(
  data: OHLCData[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
) {
  const closes = data.map((d) => d.close);
  const ema12Values = ema(closes, fastPeriod);
  const ema26Values = ema(closes, slowPeriod);

  const macdLine: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (ema12Values[i] !== null && ema26Values[i] !== null) {
      macdLine.push(ema12Values[i]! - ema26Values[i]!);
    } else {
      macdLine.push(null);
    }
  }

  const validMacd = macdLine.filter((v) => v !== null) as number[];
  const signalValues = ema(validMacd, signalPeriod);

  const macdResult: { time: string; value: number }[] = [];
  const signalResult: { time: string; value: number }[] = [];
  const histogramResult: { time: string; value: number }[] = [];

  let validIdx = 0;
  for (let i = 0; i < data.length; i++) {
    if (macdLine[i] !== null) {
      const macdVal = macdLine[i]!;
      macdResult.push({ time: data[i].time, value: Math.round(macdVal * 1000) / 1000 });
      if (signalValues[validIdx] !== null) {
        const sigVal = signalValues[validIdx]!;
        signalResult.push({ time: data[i].time, value: Math.round(sigVal * 1000) / 1000 });
        histogramResult.push({
          time: data[i].time,
          value: Math.round((macdVal - sigVal) * 1000) / 1000,
        });
      }
      validIdx++;
    }
  }

  return { macd: macdResult, signal: signalResult, histogram: histogramResult };
}

export function calculateSMA(data: OHLCData[], period: number): { time: string; value: number }[] {
  const closes = data.map((d) => d.close);
  const smaValues = sma(closes, period);
  const result: { time: string; value: number }[] = [];
  for (let i = 0; i < data.length; i++) {
    if (smaValues[i] !== null) {
      result.push({ time: data[i].time, value: Math.round(smaValues[i]! * 100) / 100 });
    }
  }
  return result;
}

export function calculateAllIndicators(data: OHLCData[]): IndicatorResult {
  const closes = data.map((d) => d.close);
  const ema12Values = ema(closes, 12);
  const ema26Values = ema(closes, 26);

  return {
    rsi: calculateRSI(data),
    macd: calculateMACD(data),
    sma20: calculateSMA(data, 20),
    sma50: calculateSMA(data, 50),
    sma200: calculateSMA(data, 200),
    ema12: data
      .map((d, i) => (ema12Values[i] !== null ? { time: d.time, value: Math.round(ema12Values[i]! * 100) / 100 } : null))
      .filter(Boolean) as { time: string; value: number }[],
    ema26: data
      .map((d, i) => (ema26Values[i] !== null ? { time: d.time, value: Math.round(ema26Values[i]! * 100) / 100 } : null))
      .filter(Boolean) as { time: string; value: number }[],
  };
}
