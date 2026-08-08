# 화이트채플의 그림자

[Letters from Whitechapel](https://boardgamegeek.com/boardgame/59959/letters-from-whitechapel)에서
영감을 받은 **1인용 웹 추적 게임**입니다. 플레이어는 경찰 순찰대 5명을 지휘하고, 잭은 AI가 조종합니다.
정적 사이트라서 GitHub Pages에 바로 올릴 수 있습니다.

## 규칙 요약

- 잭은 매일 밤 붉은 지점 중 한 곳에서 살인을 저지르고(위치 공개), 비밀 은신처로 돌아갑니다.
- 잭의 이동은 비공개이며 이동 **종류**(도보/마차/골목)만 공개됩니다.
  - **마차**(게임당 3회): 한 턴에 2칸, 경찰이 선 교차점 통과 가능
  - **골목**(게임당 2회): 같은 블록에 접한 다른 지점으로 순간 이동
- 경찰 턴: 순찰대마다 이동 1회(최대 2칸) + 행동 1회(**수색** 또는 **체포**).
  - 수색: 인접 지점에 이번 밤 잭의 흔적이 있는지 확인
  - 체포: 인접 지점에 잭이 *지금* 있으면 승리
- 잭이 이동 15번 안에 은신처로 돌아가지 못하면 새벽에 검거됩니다(경찰 승).
- 잭이 4번의 밤을 모두 버티면 잭의 승리.

## 난이도와 AI

| 난이도 | 방식 |
|---|---|
| 쉬움 | 깊이 1 탐색 + 큰 노이즈 + 낮은 위험 감지 (한 수 앞만 봄) |
| 보통 | 깊이 3 탐색 (경찰을 비관적 모델로 두고 몇 수 앞의 포위망을 회피) |
| 어려움 | 깊이 4 탐색 + 밤마다 바뀌는 페르소나 3종 + 경찰의 실제 지식(추정 위치 집합)만 반영한 상대 모델 + 상위 수 확률 혼합(패턴 리딩 방지) — **LLM 없이 구현** |
| 악몽 | **미구현** — Claude Sonnet API에 게임 상태를 보내 수를 결정할 예정 (`js/ai.js`의 `sonnetJackMove` 스텁 참고) |

무작위 경찰 베이스라인 60판 기준 잭 생존율: 쉬움 62% < 보통 63% < 어려움 70%
(사람 플레이어 기준으로는 격차가 더 벌어집니다 — 정밀 측정은 `docs/works` WC-102/103에서 진행)

쉬움/보통의 휴리스틱은 다음을 참고해 설계했습니다.

- [Monte-Carlo Tree Search for the Game of Scotland Yard (Nijssen & Winands, CIG 2011)](https://dke.maastrichtuniversity.nl/m.winands/documents/Cig2011pape42.pdf) — 숨는 쪽의 추정 위치 집합(belief set) 유지 전략
- [Letters from Whitechapel 플레이 팁 (Mayday Games)](https://www.maydaygames.com/blogs/news/track-down-jack-the-ripper-tips-clues-for-playing-letters-from-whitechapel) — 은신처·살인지점 거리, 마차/골목 운용
- [공식 규칙 요약 (UltraBoardGames)](https://www.ultraboardgames.com/letters-from-whitechapel/game-rules.php)

핵심 평가 요소: 은신처까지 잔여 거리 대비 여유(slack) 유지, 체포 사정권 회피,
추정 위치 집합을 넓게 유지(모호성 보너스), 특수 이동 비축, 단서 찍힌 지점 우회.

## 로컬 실행

ES 모듈을 쓰므로 `file://`로는 열리지 않습니다. 간단한 서버로 실행하세요.

```bash
cd whitechapel
python3 -m http.server 8000
# http://localhost:8000 접속
```

## GitHub Pages 배포

`.github/workflows/deploy-pages.yml`이 `main` 푸시 시 `whitechapel/`을 사이트 루트로 자동 배포한다.

1. PR을 `main`에 머지하면 Actions가 배포 실행 (Pages 미활성 상태면 워크플로가 활성화 시도)
2. 접속: `https://<계정>.github.io/bitter_sweet_testbed/`
3. 워크플로가 Pages 활성화에 실패하면 **Settings → Pages → Source: GitHub Actions** 한 번만 수동 설정

## 협업

개발 티켓은 `docs/works/`에서 Jira처럼 관리한다 (운영 룰: `docs/works/README.md`,
Codex 지침: `.codex/instructions.md`).

## 저작권에 대하여

- 보드게임의 **규칙·메커니즘 자체는 저작권 보호 대상이 아닙니다**(아이디어-표현 이분법).
- 보호되는 것은 원작의 **아트워크, 보드 그래픽(지도 데이터 포함), 룰북 문구, 로고**입니다.
  이 구현은 보드를 시드 기반으로 **절차 생성**하며(`js/board.js`), 원작 지도·그래픽·문구를 일절 복제하지 않습니다.
- *Letters from Whitechapel*이라는 이름은 상표일 수 있어 제목으로 쓰지 않았고,
  원작 표기는 출처 표시(팬 구현 고지)로만 사용합니다. 비상업 프로젝트입니다.
