---
id: WC-208
title: 모바일 가로모드 UX
status: DONE
assignee: claude
priority: P2
scope: whitechapel/style.css, whitechapel/index.html, whitechapel/js/main.js
depends_on: []
---
## 구현
- 세로 화면(≤920px)에서 회전 안내 오버레이 (닫기 가능 — 세로 폴백 레이아웃 유지)
- 가로 낮은 높이(≤540px) 컴팩트 레이아웃: 헤더 축소, 패널 250px, 로그/버튼 축소
- 게임 시작 시 지원 브라우저(Android Chrome 등)에서 전체화면 + 가로 방향 잠금 시도
## 작업 로그
- 2026-08-08: 완료. Playwright로 세로(390×844) 안내 표시/닫기, 가로(844×390) 미표시 확인.
