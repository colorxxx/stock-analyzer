import { NextRequest } from "next/server";

const LLM_API_KEY = process.env.LLM_API_KEY || "";
const LLM_API_BASE_URL = process.env.LLM_API_BASE_URL || "https://api.openai.com/v1";
const LLM_MODEL = process.env.LLM_MODEL || "gpt-4o-mini";

export async function POST(request: NextRequest) {
  try {
    const { ticker, from, to, priceData, indicators, quote } = await request.json();

    if (!LLM_API_KEY) {
      return new Response(
        JSON.stringify({
          error: "LLM API key not configured. Add LLM_API_KEY to your .env.local file.",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const filteredData = priceData?.filter(
      (d: { time: string }) => d.time >= from && d.time <= to
    );

    const startPrice = filteredData?.[0]?.close;
    const endPrice = filteredData?.[filteredData.length - 1]?.close;
    const priceChange = startPrice && endPrice ? ((endPrice - startPrice) / startPrice * 100).toFixed(2) : "N/A";
    const highestPrice = filteredData ? Math.max(...filteredData.map((d: { high: number }) => d.high)) : "N/A";
    const lowestPrice = filteredData ? Math.min(...filteredData.map((d: { low: number }) => d.low)) : "N/A";
    const avgVolume = filteredData
      ? Math.round(filteredData.reduce((sum: number, d: { volume: number }) => sum + d.volume, 0) / filteredData.length)
      : "N/A";

    const latestRSI = indicators?.rsi?.slice(-1)[0]?.value ?? "N/A";
    const latestMACD = indicators?.macd?.macd?.slice(-1)[0]?.value ?? "N/A";
    const latestSignal = indicators?.macd?.signal?.slice(-1)[0]?.value ?? "N/A";

    const prompt = `Analyze the stock ${ticker} for the period ${from} to ${to}.

Key Data Points:
- Start Price: $${startPrice}
- End Price: $${endPrice}
- Price Change: ${priceChange}%
- Period High: $${highestPrice}
- Period Low: $${lowestPrice}
- Average Daily Volume: ${avgVolume?.toLocaleString?.() ?? avgVolume}
- Current RSI (14): ${latestRSI}
- MACD: ${latestMACD}, Signal: ${latestSignal}
${quote ? `- Market Cap: $${(quote.marketCap / 1e9).toFixed(2)}B` : ""}
${quote?.trailingPE ? `- P/E Ratio: ${quote.trailingPE.toFixed(2)}` : ""}

Provide a concise analysis covering:
1. **Price Action Summary**: Key price movements and trends in this period
2. **Technical Analysis**: What RSI, MACD, and moving averages suggest
3. **Volume Analysis**: What volume patterns indicate
4. **Outlook**: Short-term outlook based on current technicals

Keep it actionable and data-driven. Use specific numbers.`;

    const response = await fetch(`${LLM_API_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          {
            role: "system",
            content: "You are an expert stock analyst. Provide clear, data-driven analysis. Be concise but thorough. This is for informational purposes only, not financial advice.",
          },
          { role: "user", content: prompt },
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Analyze API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: `LLM API error: ${response.status}` }),
        { status: response.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith("data: ")) continue;
              const data = trimmed.slice(6);
              if (data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  controller.enqueue(encoder.encode(content));
                }
              } catch {
                // skip
              }
            }
          }
        } finally {
          reader.releaseLock();
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Analysis request failed";
    console.error("Analyze error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
