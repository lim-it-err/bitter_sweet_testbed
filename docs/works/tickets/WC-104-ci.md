---
id: WC-104
title: CI — 푸시마다 테스트 실행
status: REVIEW
assignee: codex
priority: P2
scope: .github/workflows/test.yml
depends_on: [WC-101]
---
## 배경
두 작업자가 같은 브랜치에 푸시하므로 회귀를 CI가 잡아줘야 한다.

## 작업 내용
- `.github/workflows/test.yml`: 모든 브랜치 push + PR에서 `npm test` 실행 (Node 22).
- 배포 워크플로(`deploy-pages.yml`, claude 소유)는 건드리지 않는다.

## 완료 조건 (AC)
- 브랜치 푸시 시 Actions에서 테스트가 돌고 초록불.

## 작업 로그
- 2026-08-09 (codex): 모든 push와 PR에서 Node 22로 `npm test`를 실행하는
  `.github/workflows/test.yml`을 추가했다. 브랜치 push로 생성된 Actions run #1에서
  36개 테스트가 모두 통과해 conclusion `success`를 확인했다.
