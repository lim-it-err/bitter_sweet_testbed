---
id: WC-106
title: 단일 파일 빌드 스크립트
status: IN_PROGRESS
assignee: codex
priority: P2
scope: build/**, package.json (scripts만)
depends_on: []
---
## 배경
ES 모듈 구조라 `file://`로 못 연다. 오프라인/공유용 단일 HTML(`standalone.html`)이 필요하다.
(claude가 아티팩트 공유용으로 임시 번들을 수동 생성 중 — 이를 정식 스크립트로 만들 것)

## 작업 내용
- `build/bundle.mjs`: `whitechapel/`의 JS 모듈들을 import/export 제거 후
  의존 순서(board → game/ai → ui → main)로 이어붙이고 CSS 인라인하여
  `whitechapel/standalone.html` 생성. 외부 의존성 없이 Node 내장 모듈만 사용.
- 순환 참조(game↔ai)는 함수 선언 호이스팅으로 해결됨 — 이어붙이는 순서만 보장하면 된다.
- `npm run build` 등록.

## 완료 조건 (AC)
- 생성된 standalone.html을 브라우저에서 file://로 열어 게임 시작~턴 진행이 동작.
- 원본 모듈 수정 없이(원본이 소스of truth) 빌드만으로 재생성 가능.

## 작업 로그
