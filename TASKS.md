# Stock Analyzer - 개선 작업 목록

## 현재 버그
1. **모바일 핀치 줌 안 됨** — 차트에서 손가락 벌리기/모으기로 줌인/아웃이 안 됨. lightweight-charts v4.2.3, `handleScale.pinch: true` 설정했으나 동작 안 함. CSS `touch-action` 관련 이슈일 수 있음.
2. **캔들 클릭(탭) 안 됨** — 모바일에서 구간 선택 모드 진입 후 캔들을 탭해도 반응 없음. `subscribeClick`이 모바일 터치에서 time을 못 잡는 문제.
3. **스크롤 시 화면 흔들림/깨짐** — Key Statistics 밑으로 스크롤할 때 화면이 떨리는 현상.

## 요구사항
1. **핀치 줌** — 모바일에서 차트 위에서 두 손가락 벌리기 = 줌인, 모으기 = 줌아웃. 줌된 상태에서 좌우 스크롤도 가능해야 함.
2. **캔들 탭으로 구간 선택** — "구간 선택" 버튼 누른 후 차트에서 캔들 2번 탭하면 시작일/종료일 설정. 선택 구간 하이라이트 표시.
3. **AI 분석 결과 한글** — 이미 구현됨, 확인만.
4. **AI 채팅 위치** — 모바일: 차트 바로 밑. 데스크톱: 우측 사이드바.
5. **스크롤 깔끔하게** — 이중 스크롤 없이, 대시보드가 넘치지 않게.
6. **줌 버튼** — +/- 버튼으로 줌인/아웃 (모바일에서 핀치 안 될 경우 대비).

## 기술 스택
- Next.js 14 App Router, TypeScript, Tailwind CSS
- lightweight-charts v4.2.3 (TradingView)
- DeepSeek API (chat/analysis)
- Vercel 배포

## 파일 구조
- `src/components/StockChart.tsx` — 차트 컴포넌트 (핵심)
- `src/components/AnalysisPanel.tsx` — AI 구간 분석
- `src/components/ChatPanel.tsx` — AI 채팅
- `src/components/StockInfo.tsx` — Key Statistics
- `src/components/SearchBar.tsx` — 검색
- `src/app/stock/[ticker]/page.tsx` — 종목 페이지 레이아웃
- `src/app/api/stock/[ticker]/route.ts` — Yahoo Finance API (crumb+cookie)
- `src/app/api/analyze/route.ts` — DeepSeek 분석 API
- `src/app/api/chat/route.ts` — DeepSeek 채팅 API
- `src/lib/yahoo.ts` — Yahoo Finance 유틸
- `src/lib/indicators.ts` — RSI/MACD/SMA 계산
- `src/app/globals.css` — 글로벌 스타일
- `public/test-chart.html` — 터치 테스트 페이지

## 테스트
- 빌드 확인: `npx next build`
- 로컬 테스트: `npx next dev -p 3099 -H 0.0.0.0` → 모바일에서 http://<PC_IP>:3099 접속
- 배포: `vercel --token <token> --yes --prod`

## 우선순위
1. 핀치 줌 + 캔들 탭 (모바일 핵심 기능)
2. 스크롤/레이아웃 안정화
3. 나머지 UI 개선
