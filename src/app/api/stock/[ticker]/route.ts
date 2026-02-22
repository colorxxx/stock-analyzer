import { NextRequest, NextResponse } from "next/server";
import { getStockQuote, getHistoricalData, searchTickers } from "@/lib/yahoo";
import { calculateAllIndicators } from "@/lib/indicators";

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const ticker = params.ticker.toUpperCase();
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get("action");

  try {
    if (action === "search") {
      const results = await searchTickers(ticker);
      return NextResponse.json({ results });
    }

    const range = searchParams.get("range") || "1y";
    const now = new Date();
    let period1: Date;

    switch (range) {
      case "1m":
        period1 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "3m":
        period1 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "6m":
        period1 = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        break;
      case "1y":
        period1 = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case "2y":
        period1 = new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000);
        break;
      case "5y":
        period1 = new Date(now.getTime() - 1825 * 24 * 60 * 60 * 1000);
        break;
      default:
        period1 = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    }

    const [quote, historical] = await Promise.all([
      getStockQuote(ticker),
      getHistoricalData(ticker, period1),
    ]);

    const indicators = calculateAllIndicators(historical);

    return NextResponse.json({
      quote,
      historical,
      indicators,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch stock data";
    console.error(`Error fetching data for ${ticker}:`, message);
    return NextResponse.json(
      { error: `Failed to fetch data for ${ticker}. Please check the ticker symbol.` },
      { status: 400 }
    );
  }
}
