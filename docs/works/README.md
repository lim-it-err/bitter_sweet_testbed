# works — 화이트채플 게임 개발 티켓 보드

이 폴더는 Jira처럼 운영하는 파일 기반 티켓 시스템이다.
작업자는 두 명: **claude**(기획/UX/AI 정책/밸런스/배포 담당)와 **codex**(기술 고도화/테스트 고도화/CPU 고도화 구현 담당).

## 폴더 구조

```
docs/works/
├── README.md          ← 이 문서 (운영 룰)
├── BOARD.md           ← 현황판 (티켓 상태 요약 — 상태 바꿀 때 같이 갱신)
├── tickets/           ← 티켓 1개 = 파일 1개 (WC-<번호>-<슬러그>.md)
└── reports/           ← 시뮬레이션/밸런스 리포트 산출물
```

## 티켓 포맷

```markdown
---
id: WC-101
title: 제목
status: TODO          # TODO | IN_PROGRESS | REVIEW | DONE | BLOCKED
assignee: codex       # codex | claude
priority: P1          # P1(급함) > P2 > P3
scope: whitechapel/js/**, sim/**   # 수정 허용 파일 범위
depends_on: []        # 선행 티켓 id 목록
---
## 배경
## 작업 내용
## 완료 조건 (AC)
## 작업 로그   ← 작업자가 날짜와 함께 추가
```

## 운영 룰 (반드시 지킬 것)

1. **작업 시작 전 항상** `git pull --rebase origin claude/whitechapel-game-dev-4b46sk`.
   두 작업자가 같은 브랜치를 쓴다. 충돌을 최소화하기 위해 티켓의 `scope` 밖 파일은 건드리지 않는다.
2. 티켓 하나를 잡으면 frontmatter의 `status`를 `IN_PROGRESS`로 바꾸는 커밋을 먼저 푸시한다
   (동시 착수 방지 락 역할). 이미 `IN_PROGRESS`인 티켓은 잡지 않는다.
3. 커밋 메시지는 `WC-<번호>: <요약>` 형식. 티켓 하나당 커밋은 작게 여러 번 해도 된다.
4. 완료하면: AC를 전부 확인 → `status: REVIEW`로 변경 → 작업 로그에 결과 요약 추가 → 푸시.
   `DONE` 전환은 **상대 작업자(리뷰어)**가 한다. claude가 codex 티켓을 검증하고 DONE 처리한다.
5. 테스트가 존재하면(`npm test`) 푸시 전에 반드시 통과시킨다. 실패 상태로 푸시 금지.
6. **force push 금지.** 충돌 시 rebase로 해결하고, 자기 scope 밖 충돌은 상대 변경을 우선한다(theirs).
7. 새 작업 거리가 생기면 티켓으로 만들어 `tickets/`에 추가한다 (번호는 마지막+1).
   codex 레인은 WC-1xx, claude 레인은 WC-2xx 번호를 쓴다.
8. `BOARD.md`의 상태 표를 상태 변경 커밋에 포함해 항상 최신으로 유지한다.

## 게임 코드 개요 (`whitechapel/`)

- `js/board.js` — 시드 고정 절차 생성 보드 (교차점-도로-지점, 골목 블록)
- `js/game.js` — 규칙 엔진 (밤 구조, 이동/수색/체포, belief 계산)
- `js/ai.js` — 잭 AI (쉬움/보통/어려움: 깊이 제한 탐색, 페르소나, belief 상대 모델 / 악몽: Sonnet 스텁)
- `js/ui.js`, `js/main.js`, `index.html`, `style.css` — UI (claude 레인)

헤드리스 실행: board/game/ai는 DOM 의존이 없어 Node로 직접 import해 시뮬레이션 가능.
