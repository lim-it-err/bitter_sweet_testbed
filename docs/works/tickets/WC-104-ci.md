---
id: WC-104
title: CI — 푸시마다 테스트 실행
status: TODO
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
