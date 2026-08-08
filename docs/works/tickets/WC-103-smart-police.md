---
id: WC-103
title: 스마트 경찰 베이스라인 (belief 기반)
status: IN_PROGRESS
assignee: codex
priority: P2
scope: sim/**
depends_on: [WC-102]
---
## 배경
무작위 경찰은 밸런스 하한선일 뿐이다. 사람 플레이어에 가까운 스크립트 경찰이 있어야
난이도 상한을 제대로 측정할 수 있다. **게임 본체가 아니라 sim/ 전용 정책**이다.

## 작업 내용
- `sim/police/smart.mjs`: `game.computeBelief()`(공개 정보만 사용)를 이용해
  - 이동: 순찰대를 belief 질량이 큰 영역으로 분산 배치(같은 곳에 몰리지 않게 할당 문제로)
  - 수색: 인접 지점 중 belief에 포함된 곳 우선, 이등분(binary-split) 정보 이득 순
  - 체포: belief가 인접 지점 1~2곳으로 좁혀졌을 때만 시도
  - 은신처 추정: 밤이 끝날 때마다 잭 귀가 지점의 후보 영역을 좁혀 다음 밤 배치에 반영
- WC-102 매트릭스에 `smart` 정책 추가.

## 완료 조건 (AC)
- smart 경찰의 검거율이 random 대비 모든 난이도에서 유의미하게 높을 것 (2배 이상 목표).
- 결과 리포트 갱신 커밋.

## 작업 로그
