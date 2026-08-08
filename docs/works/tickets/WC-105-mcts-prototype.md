---
id: WC-105
title: MCTS 잭 프로토타입 (오프라인 비교)
status: REVIEW
assignee: codex
priority: P3
scope: sim/**, whitechapel/js/ai.js (승격 시에만, 별도 함수로 추가)
depends_on: [WC-102, WC-103]
---
## 배경
현재 어려움 AI는 깊이 4 휴리스틱 탐색이다. Scotland Yard 연구(Nijssen & Winands, CIG 2011)처럼
MCTS(determinization 포함)가 더 강한지 오프라인으로 검증하고 싶다.

## 작업 내용
- `sim/ai/mcts.mjs`: 잭 관점 MCTS.
  - 시뮬레이션 예산: 이동당 500~2000 플레이아웃 (브라우저 이식 대비 시간 측정 필수)
  - 경찰 롤아웃 정책: WC-103 smart 경찰 사용
  - 보상: 밤 생존 +1, 검거 -1, 중간 보상 없음(또는 slack 기반 shaping 비교)
- WC-102 하네스로 현행 heuristic vs MCTS를 smart 경찰 상대 300판 이상 비교.

## 완료 조건 (AC)
- 비교 리포트 (승률, 이동당 평균 계산 시간). 
- MCTS가 유의미하게 강하고 이동당 300ms 이하면: `whitechapel/js/ai.js`에 별도 함수로 이식하고
  claude에게 난이도 통합 여부 리뷰 요청 (status: REVIEW).

## 작업 로그
- 2026-08-09 (codex): `sim/ai/mcts.mjs`에 잭 관점 UCT MCTS와 WC-103 smart 경찰의
  belief 기반 추적을 반영한 롤아웃 모델을 구현했다. 보상은 밤 생존 `+1`, 체포·새벽·포위
  `-1`만 사용하고 중간 shaping은 넣지 않았다.
- 2026-08-09 (codex): 시뮬레이션 엔진/CLI에 잭 정책(`heuristic`, `mcts`)과 플레이아웃 예산,
  이동당 결정 시간 측정을 추가하고 `sim/compare-mcts.mjs`로 동일 시드 비교를 자동화했다.
- 2026-08-09 (codex): `node sim/compare-mcts.mjs --games 300 --playouts 500 --report`
  검증 결과 smart 경찰 상대 생존율은 heuristic `23.7%`(71/300), MCTS `13.0%`(39/300),
  차이 `-10.7%p`, 두 비율 z-score `-3.38`이었다. MCTS 이동당 평균 결정 시간은
  `30.30ms`로 시간 기준(`300ms` 미만)은 충족했지만 성능이 유의하게 낮아 브라우저
  `whitechapel/js/ai.js`에는 승격하지 않았다.
- 2026-08-09 (codex): 비교 리포트 `docs/works/reports/mcts-2026-08-09.md` 생성.
  `npm test` 36/36 통과, `npm run build` 성공(standalone HTML 72,530 bytes).
