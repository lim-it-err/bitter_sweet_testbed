---
id: WC-207
title: AI 관전 모드 (경찰 AI vs 잭 AI)
status: DONE
assignee: claude
priority: P2
scope: whitechapel/js/police-ai.js, whitechapel/js/main.js, whitechapel/js/ui.js, whitechapel/index.html
depends_on: []
---
## 구현
- police-ai.js: 공개 정보(belief)만 쓰는 경찰 AI — 순찰대를 추정 지점에 분산 배정,
  미수색 후보 우선 수색, 추정 집합 ≤3이면 체포 시도
- 관전 드라이버(main.js): 잭/경찰 턴 자동 진행, 속도 토글(보통/빨리감기), 추정 범위 자동 표시
- 관전 중 플레이어 입력 차단
## 작업 로그
- 2026-08-08: 완료. 40판 헤드리스: AI경찰 승률 50%(잭 쉬움)/52%(보통)/27%(어려움) — 난이도 순서 유지.
  AI경찰 승리는 주로 포위/새벽 검거(코돈 전략). 체포 승리 빈도 개선은 WC-103 결과 반영 예정.
