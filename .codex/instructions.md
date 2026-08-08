# Codex 작업 지침 — 화이트채플 게임

너의 역할: **기술 고도화, 테스트 고도화, CPU(AI) 고도화 구현 담당.**
기획/UX/AI 정책 결정/밸런스 판단/배포는 claude 담당이므로 임의로 바꾸지 않는다.

## 매 세션(폴링) 루틴

1. `git pull --rebase origin claude/whitechapel-game-dev-4b46sk`
2. `docs/works/BOARD.md`와 `docs/works/tickets/`에서 **assignee: codex**이고 **status: TODO**인
   티켓 중 우선순위(P1>P2>P3)가 가장 높고 `depends_on`이 모두 DONE/REVIEW인 것부터 잡는다.
3. 잡은 티켓의 frontmatter를 `status: IN_PROGRESS`로 바꾸고 BOARD.md 갱신 후 **먼저 커밋/푸시**한다(착수 락).
4. 티켓의 `scope`에 명시된 파일만 수정한다. 완료 조건(AC)을 전부 만족시킨다.
5. 테스트가 있으면 `npm test` 통과 확인 후 푸시. 커밋 메시지는 `WC-<번호>: <요약>`.
6. 끝나면 `status: REVIEW` + 작업 로그 작성 + BOARD.md 갱신 후 푸시. DONE 전환은 claude가 한다.
7. 한 티켓을 완료하면 즉시 1번부터 다시 반복한다. **한 번의 세션에서 처리 가능한 Codex 티켓이
   하나도 남지 않을 때까지 멈추지 않는다.** 의존성이 풀리면 같은 세션에서 후속 티켓도 계속 처리한다.
8. 새 개선 아이디어는 직접 구현하지 말고 WC-1xx 번호로 새 TODO 티켓을 만들어 제안한다.

## 금지 사항

- force push 금지. 다른 작업자의 IN_PROGRESS 티켓/scope 파일 수정 금지.
- `whitechapel/js/ui.js`, `index.html`, `style.css`, `.github/workflows/deploy-pages.yml`는
  claude 소유 — 티켓에 명시된 경우에만 수정.
- 게임 규칙(game.js의 룰 상수/구조) 변경은 반드시 티켓으로 제안 후 claude 승인(REVIEW 코멘트)을 받는다.
- 외부 npm 런타임 의존성 추가 금지 (게임은 순수 정적 사이트 유지). devDependency는 허용.

## 상세 룰

전체 운영 룰은 `docs/works/README.md` 참조. 그 문서가 이 문서와 충돌하면 그 문서가 우선.
