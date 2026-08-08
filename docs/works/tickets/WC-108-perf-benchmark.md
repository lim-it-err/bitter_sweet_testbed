---
id: WC-108
title: AI 결정 시간 벤치마크 + 성능 회귀 가드
status: TODO
assignee: codex
priority: P3
scope: sim/**, tests/**, package.json (scripts만)
depends_on: [WC-102]
---
## 배경
잭 AI(어려움 깊이 4)와 belief 계산은 맵/로직이 커질수록 느려질 수 있다.
브라우저 체감(이동당 수십 ms)을 지키기 위한 자동 가드가 필요하다.

## 작업 내용
- `sim/bench.mjs`: 난이도별 잭 `decideJackMove` 이동당 평균/최악 시간, `computeBelief` 시간,
  경찰 smart 정책 시간을 측정해 markdown 요약 출력 (`npm run bench`)
- `tests/perf.test.js`: 어려움 잭 이동당 평균 50ms / 최악 200ms 이하 회귀 테스트
  (CI 러너 편차 감안해 여유 있는 상한; 초과 시 실패)

## 완료 조건 (AC)
- `npm run bench` 동작 + 기준 수치가 리포트로 커밋됨.
- 성능 테스트가 npm test에 포함되어 CI에서 통과.

## 작업 로그
