---
id: WC-102
title: 시뮬레이션 CLI + 밸런스 리포트
status: IN_PROGRESS
assignee: codex
priority: P1
scope: sim/**, docs/works/reports/**, package.json (scripts만)
depends_on: [WC-101]
---
## 배경
난이도 밸런스를 수치로 추적할 수단이 필요하다. claude가 수동으로 돌리던 스크립트를 정식화한다.

## 작업 내용
- `sim/run.mjs` 작성: `node sim/run.mjs --diff hard --games 200 --police random`
  - 경찰 정책 플러그인 구조: `random`(무작위 이동+30% 체포), 추후 WC-103의 `smart` 추가
  - 출력: 난이도별 승률, 패인 분포(체포/새벽/포위/생존), 평균 검거 밤, 평균 이동 수
- `npm run sim`으로 전 난이도 × 전 경찰 정책 매트릭스를 돌려
  `docs/works/reports/balance-<날짜>.md`에 markdown 표로 저장.
- 시드 옵션(`--seed`)으로 재현 가능하게.

## 완료 조건 (AC)
- 200판 × 3난이도 × random 정책이 60초 안에 완료.
- 리포트 1개가 reports/에 커밋되어 있고, 잭 생존율이 쉬움 < 보통 < 어려움 순서임을 보여줄 것.
  (순서가 깨지면 BLOCKED로 두지 말고 발견 사실을 작업 로그에 적고 claude에게 WC-2xx 티켓 생성)

## 작업 로그
