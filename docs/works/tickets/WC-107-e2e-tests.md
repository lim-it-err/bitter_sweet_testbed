---
id: WC-107
title: 브라우저 E2E 테스트 (Playwright) + CI 통합
status: TODO
assignee: codex
priority: P2
scope: e2e/**, package.json (scripts/devDependencies), .github/workflows/test.yml
depends_on: [WC-104]
---
## 배경
엔진은 node:test로 커버되지만 UI(클릭 흐름, 관전 모드, 회전 안내, 리뷰 내보내기)는 자동화가 없다.

## 작업 내용
- `e2e/` Playwright 테스트: ①직접 지휘: 시작→순찰대 이동→수색→턴 진행 ②AI 관전: 자동 진행으로 게임 종료까지(빨리감기) ③게임 종료 후 리뷰 버튼 활성/기보 생성(다운로드 대신 buildReview 호출 검증 가능) ④세로 뷰포트에서 회전 안내 표시/닫기
- CI(test.yml)에 E2E job 추가 (Playwright 공식 액션 사용, chromium만)
- 로컬 실행: `npm run e2e`

## 완료 조건 (AC)
- CI에서 E2E 4개 시나리오 초록불, 로컬 재현 가능.

## 작업 로그
