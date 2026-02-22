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

    const prompt = `${ticker} 종목의 ${from} ~ ${to} 기간을 분석해주세요.

주요 데이터:
- 시작가: $${startPrice}
- 종가: $${endPrice}
- 가격 변동률: ${priceChange}%
- 기간 최고가: $${highestPrice}
- 기간 최저가: $${lowestPrice}
- 평균 일일 거래량: ${avgVolume?.toLocaleString?.() ?? avgVolume}
- RSI (14): ${latestRSI}
- MACD: ${latestMACD}, Signal: ${latestSignal}
${quote ? `- 시가총액: $${(quote.marketCap / 1e9).toFixed(2)}B` : ""}
${quote?.trailingPE ? `- PER: ${quote.trailingPE.toFixed(2)}` : ""}

다음 항목을 포함하여 간결하게 분석해주세요:
1. **가격 흐름 요약**: 해당 기간의 주요 가격 움직임과 추세
2. **기술적 분석**: RSI, MACD, 이동평균선이 시사하는 점
3. **거래량 분석**: 거래량 패턴이 의미하는 것
4. **전망**: 현재 기술적 지표 기반 단기 전망

구체적인 수치를 사용하여 실용적으로 분석해주세요.`;

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
            content: "You are an expert stock analyst. Provide clear, data-driven analysis. Be concise but thorough. This is for informational purposes only, not financial advice. Respond in Korean (한국어).",
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
