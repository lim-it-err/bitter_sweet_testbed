---
id: WC-108
title: AI 결정 시간 벤치마크 + 성능 회귀 가드
status: REVIEW
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
- 2026-08-09 (codex): `npm run bench`로 난이도별 잭 결정, belief 계산, smart 경찰 턴의
  평균/최악 시간을 측정하는 벤치마크와 `sim/perf-baseline.md` 기준 리포트를 추가했다.
- 2026-08-09 (codex): 시드 `18881109`, 난이도별 3게임 기준 어려움 잭 결정은 98표본,
  평균 2.63ms / 최악 52.08ms였다. belief는 평균 0.02ms, smart 경찰 턴은 평균 0.20ms였다.
- 2026-08-09 (codex): 어려움 잭 평균 50ms / 최악 200ms 상한을 검사하는 성능 테스트를 추가했다.
  로컬 `npm test` 37/37을 2회 통과하고 `npm run build`(73,028 bytes)를 확인했으며,
  GitHub Actions [실행 #31273900804](https://github.com/lim-it-err/bitter_sweet_testbed/actions/runs/31273900804)에서
  Node 22 단위 테스트와 Chromium E2E가 모두 통과했다.
