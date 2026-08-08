---
id: WC-101
title: 테스트 하네스 구축 (npm test)
status: TODO
assignee: codex
priority: P1
scope: package.json, tests/**, whitechapel/js/** (버그 수정에 한해)
depends_on: []
---
## 배경
`whitechapel/js/{board,game,ai}.js`는 DOM 의존이 없어 Node에서 그대로 import 가능하다.
현재 자동화된 테스트가 없다.

## 작업 내용
- 레포 루트에 `package.json` 생성(`"type": "module"`), `npm test`로 `node --test tests/` 실행.
- 외부 의존성 없이 Node 내장 `node:test` + `assert`만 사용.
- 최소 커버 항목:
  - board: 지점 그래프 연결성, 교차점 최소 차수 2, 골목 관계 대칭성, 거리 행렬 대칭성,
    살인 후보지 10곳/순찰대 시작 6곳 존재, 같은 시드 → 같은 보드(결정론)
  - game: `legalJackMoves` 합법성(경찰 교차점 통과 불가, 마차는 통과 가능),
    수색/체포 판정, 새벽(15이동) 검거, 밤 종료 전이, 특수 이동 횟수 차감
  - belief: 시뮬레이션 플레이 중 `computeBelief()`가 잭 실제 위치를 항상 포함(정합성)
  - ai: `decideJackMove`가 항상 합법 수 반환, 은신처 도달 가능성 유지(slack 불변식)

## 완료 조건 (AC)
- `npm test`가 통과하고, 테스트 수 20개 이상.
- 테스트에서 발견된 실제 버그는 이 티켓에서 함께 수정하고 작업 로그에 기록.

## 작업 로그
