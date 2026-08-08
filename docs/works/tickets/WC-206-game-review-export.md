---
id: WC-206
title: 게임 리뷰(기보) 내보내기 — LLM 분석용
status: DONE
assignee: claude
priority: P1
scope: whitechapel/js/review.js, whitechapel/js/game.js, whitechapel/js/ui.js, whitechapel/index.html
depends_on: []
---
## 배경
게임 종료 후 "언제 어디를 지나갔고 경찰이 뭘 했는지"를 파일로 내보내,
아무 LLM 채팅에나 붙여넣으면 플레이 분석을 받을 수 있게 한다. (API 연동 아님 — 복붙/업로드 방식)

## 구현
- game.js: 구조화 이벤트 로그(events) — 살인/잭 이동(종류·경유·목적지)/순찰대 이동/수색 결과/체포 시도/밤 종료/게임 종료
- review.js: 마크다운 기보 생성 — ①처음 보는 LLM용 규칙 설명 ②이 판의 설정(난이도·은신처·시작 배치)
  ③밤별 타임라인 ④통계 ⑤보드 인접 그래프(지점·교차점·골목) ⑥분석 요청 가이드(등급/전환점/결정적 순간/은신처 추리/조언)
- ui.js/index.html: 게임 종료 시 활성화되는 "기보 파일 저장"(.md 다운로드) / "복사"(클립보드) 버튼

## 작업 로그
- 2026-08-08: 구현 완료. 헤드리스 풀게임 기준 기보 ~20KB, 전 섹션 생성 확인. 브라우저 스모크 테스트 통과.
