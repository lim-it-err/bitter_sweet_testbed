---
id: WC-202
title: 어려움 난이도 — LLM 없는 고급 AI
status: DONE
assignee: claude
priority: P1
scope: whitechapel/js/ai.js, whitechapel/js/game.js
depends_on: []
---
## 설계 (LLM 없이 강하게 만드는 방법)
1. 깊이 4 탐색 (보통=3, 쉬움=1)
2. 페르소나 3종(phantom/sprinter/drifter)을 밤마다 무작위 선택 → 가중치 프로필이 바뀌어 패턴 리딩 방지
3. 경찰 상대 모델을 "전지적"이 아니라 "공개 정보(belief set)만 아는" 모델로 교체 → 과잉 회피 없이 진짜 위험만 회피
4. 최선 수 ±12점 이내 후보 중 확률 혼합 선택 → 결정론 제거(비착취성)
5. belief 기반 경찰 예측은 탐색 레벨별 1회 캐싱(성능)
## 작업 로그
- 2026-08-08: 구현 완료. 무작위 경찰 60판 기준 잭 생존율 쉬움 62% < 보통 63% < 어려움 70%, 체포당한 비율 25%/15%/13%.
