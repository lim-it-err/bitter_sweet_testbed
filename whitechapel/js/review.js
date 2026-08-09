// 게임 리뷰(기보) 내보내기 — 게임 종료 후 전체 기록을 마크다운으로 만든다.
// 이 파일을 처음 보는 LLM도 분석할 수 있도록 규칙 설명과 보드 그래프를 함께 담는다.

import { MOVES_PER_NIGHT, NIGHTS } from './game.js';

const KIND_KO = { move: '도보', coach: '마차', alley: '골목' };
const END_KO = {
  arrest: '체포 성공 (경찰 승)',
  dawn: '새벽까지 은신처 미귀환 (경찰 승)',
  trapped: '잭 포위 (경찰 승)',
  survived: `${NIGHTS}밤 생존 (잭 승)`,
};

export function buildReview(game) {
  const b = game.board;
  const num = (cid) => b.circles[cid].num;
  const crossName = (crid) => `C${crid}`;
  const lines = [];
  const push = (s = '') => lines.push(s);

  // ── 1. LLM 안내 + 규칙 ──────────────────────────────────────────────
  push('# 화이트채플의 그림자 — 게임 리뷰 요청');
  push();
  push('이 문서는 1인용 추적 보드게임 한 판의 **완전한 기보**입니다.');
  push('당신(AI)에게 부탁: 아래 규칙을 읽고, 경찰(사람 플레이어)의 플레이를 리뷰해 주세요.');
  push();
  push('## 게임 규칙 (처음 보는 분을 위한 설명)');
  push();
  push('- 보드는 **지점(원, 번호)**과 **교차점(C번호)**으로 이뤄진 그래프입니다.');
  push('  - 잭(AI)은 지점 위를 이동하고, 경찰 순찰대는 교차점 위에 섭니다.');
  push('  - 두 지점은 교차점을 사이에 두고 인접합니다. 잭은 도보 이동 시 경찰이 서 있는 교차점을 통과할 수 없습니다.');
  push(`- 게임은 ${NIGHTS}번의 밤. 각 밤: 잭이 살인 지점(공개)에서 출발해 비밀 은신처로 귀환해야 합니다.`);
  push(`  - 잭은 한 턴에 1회 이동, 밤당 최대 ${MOVES_PER_NIGHT}회. ${MOVES_PER_NIGHT}회 안에 귀환 못 하면 검거(경찰 승).`);
  push('  - 은신처는 4밤 내내 같은 곳이며 게임 끝까지 비밀. (이 기보에는 공개되어 있음)');
  push('- 잭의 이동 종류(종류만 공개, 목적지는 비공개):');
  push('  - **도보**: 인접 지점으로 1칸');
  push('  - **마차**(게임당 4회): 한 턴에 2칸, 경찰 교차점 통과 가능');
  push('  - **골목**(게임당 3회): 같은 블록(격자 한 칸)에 접한 다른 지점으로 순간 이동');
  push('- 잭 이동 후 경찰 턴: 순찰대 각각 이동 1회(교차점 최대 2칸) 후 행동 1회 (순서: 이동 → 행동):');
  push('  - **수색**: 자기 교차점에 인접한 지점들을 번호 순서로 차례로 확인 — "이번 밤 잭이 지나갔는지".');
  push('    단서가 나오면 그 지점에서 수색이 멈춘다 (그 뒤 지점들은 확인 안 됨).');
  push('  - **체포**: 인접 지점 1곳을 덮침 — 잭이 *지금 그 지점에 있어야만* 성공');
  push('- 승리: 경찰은 체포/포위/새벽 검거, 잭은 4밤 생존.');
  push();

  // ── 2. 이 판의 설정 ────────────────────────────────────────────────
  push('## 이 판의 설정');
  push();
  push(`- 난이도: ${game.diff.name} (잭 AI)`);
  push(`- 결과: **${END_KO[game.events.find((e) => e.t === 'end')?.reason] ?? '진행 중'}**`);
  push(`- 잭의 은신처: **${num(game.jack.hideout)}번 지점** (게임 중에는 비밀이었음)`);
  push(`- 살인 후보지(붉은 지점): ${b.murderSites.map(num).join(', ')}`);
  push(`- 순찰대 시작 교차점: ${game.patrols.map((p, i) => `P${i + 1}=${crossName(b.policeStarts[i])}`).join(', ')}`);
  push(`- 잭 특수 이동 잔여: 마차 ${game.jack.coaches}/4, 골목 ${game.jack.alleys}/3`);
  push();

  // ── 3. 타임라인 ────────────────────────────────────────────────────
  push('## 타임라인 (기보)');
  push();
  push('표기: `잭#n`은 그 밤 n번째 이동. 경찰 행동은 잭 이동 n 직후의 대응입니다.');
  push();
  for (const e of game.events) {
    if (e.t === 'night') {
      push(`### ${e.night}번째 밤 — ${num(e.site)}번 지점에서 살인`);
      push();
    } else if (e.t === 'jack') {
      const via = e.mid !== null && e.mid !== undefined ? ` (경유 ${num(e.mid)})` : '';
      push(`- 잭#${e.moveNo}: ${KIND_KO[e.kind]} ${num(e.from)} → ${num(e.to)}${via}`);
    } else if (e.t === 'pmove') {
      push(`  - P${e.pid + 1} 이동 ${crossName(e.from)} → ${crossName(e.to)}`);
    } else if (e.t === 'search') {
      const parts = e.results.map((r) => `${num(r.circle)}${r.found ? '**단서!**' : '✕'}`).join(', ');
      push(`  - P${e.pid + 1} 주변 수색: ${parts}`);
    } else if (e.t === 'arrest') {
      push(`  - P${e.pid + 1} 체포 시도 ${num(e.circle)}번 → ${e.success ? '**성공!**' : '실패(빈 곳)'}`);
    } else if (e.t === 'nightEnd') {
      push();
      push(`> 잭이 이동 ${e.moves}회 만에 은신처(${num(game.jack.hideout)}번) 도착 — ${e.night}번째 밤 종료`);
      push();
    } else if (e.t === 'end') {
      push();
      push(`**게임 종료 (${e.night}번째 밤): ${END_KO[e.reason]}**`);
      push();
    }
  }

  // ── 4. 통계 ────────────────────────────────────────────────────────
  const searches = game.events.filter((e) => e.t === 'search');
  const arrests = game.events.filter((e) => e.t === 'arrest');
  push('## 통계');
  push();
  push(`- 수색 ${searches.length}회 (단서 적중 ${searches.filter((e) => e.results.some((r) => r.found)).length}회)`);
  push(`- 체포 시도 ${arrests.length}회 (성공 ${arrests.filter((e) => e.success).length}회)`);
  push(`- 밤별 잭 이동 수: ${game.allPaths.map((p, i) => `${i + 1}밤 ${p.length - 1}회`).join(', ')}`);
  push();

  // ── 5. 보드 그래프 ─────────────────────────────────────────────────
  push('## 보드 그래프 (분석용 데이터)');
  push();
  push('### 지점 인접 관계 — `지점번호: 인접지점(사이 교차점)`');
  push();
  push('```');
  for (const c of b.circles) {
    const adj = b.circleAdj[c.id].map((e) => `${num(e.to)}(${crossName(e.via)})`).join(' ');
    push(`${c.num}: ${adj}`);
  }
  push('```');
  push();
  push('### 골목(같은 블록) 관계 — 잭이 골목 이동으로 오갈 수 있는 지점끼리');
  push();
  push('```');
  const seen = new Set();
  for (const c of b.circles) {
    const mates = b.alleyMates[c.id].filter((m) => !seen.has(m));
    if (mates.length) push(`${c.num}: ${mates.map(num).join(' ')}`);
    seen.add(c.id);
  }
  push('```');
  push();

  // ── 6. 분석 가이드 ─────────────────────────────────────────────────
  push('## 분석해 주세요');
  push();
  push('1. **총평**: 경찰 플레이의 등급(S~D)과 한 줄 요약');
  push('2. **밤별 리뷰**: 각 밤의 전환점 — 수색 위치 선택이 정보를 얼마나 좁혔는지,');
  push('   순찰대 배치가 잭의 실제 경로(위 기보에 공개됨)와 얼마나 어긋났는지');
  push('3. **결정적 순간**: 잭을 잡을 수 있었는데 놓친 턴(체포 타이밍/위치), 반대로 좋은 판단이었던 턴');
  push('4. **은신처 추리**: 공개된 정보만으로 은신처를 언제쯤 특정할 수 있었는지');
  push('5. **다음 판 조언**: 이 플레이어의 습관을 근거로 한 구체적 개선점 3가지');
  push();
  push('분석 시 참고: 잭이 도보 이동을 선언한 턴에는 경찰이 선 교차점을 통과하지 못했다는 것도');
  push('단서가 됩니다(경로 제약). 마차/골목 선언 턴은 추정 범위가 넓어집니다.');
  push();
  return lines.join('\n');
}
