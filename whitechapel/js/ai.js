// 잭 AI.
//
// 쉬움/보통: 깊이 제한(max depth) 탐색 + 휴리스틱 평가.
//   전략은 Scotland Yard MCTS 연구와 화이트채플 커뮤니티 전략을 참고했다:
//   - 추정 위치 집합(belief set)을 넓게 유지해 경찰의 수색을 흐린다
//   - 순찰대와 인접한 지점(체포 사정권)을 피한다
//   - 은신처까지의 잔여 거리 대비 여유(slack)를 항상 확보한다
//   - 마차는 포위 돌파용, 골목은 추적 끊기용으로 아껴 쓴다
//   - 단서가 발견된 지점과 직선 경로를 피해 우회한다
//
// 어려움: Claude Sonnet에게 게임 상태를 넘겨 수를 결정하게 할 예정 — 아직 미구현.

import { MOVES_PER_NIGHT } from './game.js';

// ---------------------------------------------------------------------------
// 어려움(Sonnet) 난이도 — 미구현 스텁
// ---------------------------------------------------------------------------
// TODO: 게임 상태(보드 그래프, 잭 위치/은신처, 순찰대 위치, 단서 이력)를 직렬화해
// Claude Sonnet API(claude-sonnet-5)에 보내고, 응답으로 이동을 받는다.
// GitHub Pages는 정적 호스팅이라 API 키를 안전하게 둘 곳이 없으므로
// (1) 사용자가 자신의 API 키를 입력하는 방식 또는 (2) 서버리스 프록시가 필요하다.
export async function sonnetJackMove(_game) {
  throw new Error('어려움(Sonnet) 난이도는 아직 구현되지 않았습니다.');
}

// ---------------------------------------------------------------------------
// 은신처 / 살인 지점 선택
// ---------------------------------------------------------------------------

export function chooseHideout(game) {
  const { board } = game;
  const murderSet = new Set(board.murderSites);
  let best = -1, bestScore = -Infinity;
  for (const c of board.circles) {
    if (murderSet.has(c.id)) continue;
    // 살인 후보지와 인접한 곳도 제외(너무 뻔한 위치)
    if (board.circleAdj[c.id].some((e) => murderSet.has(e.to))) continue;
    // 경찰 시작 지점에서 멀수록 좋음
    const policeDist = Math.min(
      ...game.patrols.map((p) => Math.min(
        board.crossingDist[p.crossing][c.a],
        board.crossingDist[p.crossing][c.b],
      )),
    );
    // 살인 후보지까지의 거리가 6~12 사이인 곳이 이상적(도달 가능하되 뻔하지 않게)
    let bandScore = 0;
    for (const m of board.murderSites) {
      const d = board.circleDist[c.id][m];
      if (d >= 6 && d <= 12) bandScore += 2;
      else if (d < 4) bandScore -= 3;
    }
    const score = policeDist * 3 + bandScore + Math.random() * 10;
    if (score > bestScore) { bestScore = score; best = c.id; }
  }
  return best;
}

export function chooseMurderSite(game) {
  const { board, jack } = game;
  const candidates = board.murderSites.filter((s) => !game.usedMurderSites.includes(s));
  let best = candidates[0], bestScore = -Infinity;
  for (const s of candidates) {
    const dHide = board.circleDist[s][jack.hideout];
    if (dHide > MOVES_PER_NIGHT - 3) continue; // 여유 없이는 안 됨
    // 은신처와 적당히 떨어진 곳(6~13)이 좋음: 너무 가까우면 은신처가 들통난다
    let score = dHide >= 6 && dHide <= 13 ? 20 : (dHide < 4 ? -20 : 5);
    // 마지막 밤에는 가까운 곳도 감수(안전 귀가 우선)
    if (game.night + 1 >= 4) score += Math.max(0, 10 - dHide);
    const policeDist = Math.min(
      ...game.patrols.map((p) => Math.min(
        board.crossingDist[p.crossing][board.circles[s].a],
        board.crossingDist[p.crossing][board.circles[s].b],
      )),
    );
    score += policeDist * 2 + Math.random() * (game.diff.noise / 4 + 1);
    if (score > bestScore) { bestScore = score; best = s; }
  }
  return best;
}

// ---------------------------------------------------------------------------
// 잭의 성향(페르소나) — 어려움 난이도에서 밤마다 무작위로 바뀌어 패턴 읽기를 막는다
// ---------------------------------------------------------------------------
// ambW: 모호성(추정 위치 넓게 유지) / dangerW: 위험 회피 / homingW: 귀가 압박 / saveW: 특수 이동 절약

export const PERSONAS = [
  { name: 'phantom', ambW: 2.0, dangerW: 1.2, homingW: 0.9, saveW: 1.0 }, // 안개처럼 — 흔적을 흐린다
  { name: 'sprinter', ambW: 0.7, dangerW: 0.8, homingW: 1.6, saveW: 0.5 }, // 전력 질주 — 특수 이동을 아끼지 않는다
  { name: 'drifter', ambW: 1.2, dangerW: 1.6, homingW: 1.0, saveW: 1.2 }, // 신중하게 — 경찰 근처엔 얼씬도 안 한다
];

export function pickPersona() {
  return PERSONAS[Math.floor(Math.random() * PERSONAS.length)];
}

const DEFAULT_WEIGHTS = { ambW: 1, dangerW: 1, homingW: 1, saveW: 1 };

// ---------------------------------------------------------------------------
// 이동 결정 (쉬움/보통/어려움: max depth 탐색)
// ---------------------------------------------------------------------------

export async function decideJackMove(game) {
  if (game.diff.sonnet) return sonnetJackMove(game);

  const cands = feasibleMoves(game, game.jack.pos, game.jack.movesUsed, game.jack.coaches, game.jack.alleys, game.patrols);
  if (cands.length === 0) return null; // 포위됨

  // 추정 위치 집합 — 모호성 보너스와 (어려움) 상대 모델 양쪽에 사용
  const belief = game.computeBelief();
  game._rootBelief = belief;

  // 어려움: belief 기반 경찰 예측은 후보 수와 무관하므로 탐색 레벨별로 미리 1회만 계산
  if (game.diff.beliefModel && belief.size > 0) {
    game._patrolsByLevel = [];
    let cur = virtualPatrols(game.patrols);
    for (let lvl = 0; lvl < Math.max(1, game.diff.maxDepth); lvl++) {
      cur = advancePatrolsBelief(game.board, cur, belief);
      game._patrolsByLevel.push(cur);
    }
  } else {
    game._patrolsByLevel = null;
  }

  const scored = cands.map((cand) => {
    let score = evaluateMove(game, cand, game.jack.movesUsed, game.jack.coaches, game.jack.alleys, virtualPatrols(game.patrols), game.diff.maxDepth);
    score += ambiguityBonus(game, belief, cand) * weights(game).ambW;
    score += (Math.random() - 0.5) * game.diff.noise;
    return { cand, score };
  });
  scored.sort((a, b) => b.score - a.score);

  // 어려움: 최선과 근접한 수들 사이에서 확률적으로 선택 — 결정론적 패턴을 없앤다
  if (game.diff.mixedTopK && scored.length > 1) {
    const near = scored.filter((s) => s.score >= scored[0].score - 12);
    if (near.length > 1 && Math.random() < 0.35) {
      return near[1 + Math.floor(Math.random() * (near.length - 1))].cand;
    }
  }
  return scored[0].cand;
}

function weights(game) {
  return game.persona ?? DEFAULT_WEIGHTS;
}

function virtualPatrols(patrols) {
  return patrols.map((p) => ({ crossing: p.crossing }));
}

// 은신처 도달 가능성을 지키는 후보만 남긴다.
// 경찰의 통행 차단으로 최단거리가 늘어질 수 있으므로 여유 2를 버퍼로 우선 확보하고,
// 안 되면 버퍼 없이, 그래도 없으면 전체 반환(어차피 진 게임).
function feasibleMoves(game, pos, movesUsed, coaches, alleys, patrols) {
  const all = game.legalJackMoves(pos, coaches, alleys, patrols);
  const remainAfter = MOVES_PER_NIGHT - movesUsed - 1;
  const d = (m) => game.board.circleDist[m.to][game.jack.hideout];
  const buffered = all.filter((m) => d(m) <= remainAfter - 2);
  if (buffered.length > 0) return buffered;
  const ok = all.filter((m) => d(m) <= remainAfter);
  return ok.length > 0 ? ok : all;
}

// 선언된 이동 종류에 따라 경찰이 좁힐 수 있는 범위가 달라짐 → 벨리프가 넓게 유지되는 수를 선호
function ambiguityBonus(game, belief, cand) {
  const next = new Set();
  for (const pos of belief) {
    if (cand.type === 'move') {
      for (const { to } of game.board.circleAdj[pos]) next.add(to);
    } else if (cand.type === 'coach') {
      for (const { to: m } of game.board.circleAdj[pos]) {
        for (const { to } of game.board.circleAdj[m]) if (to !== pos) next.add(to);
      }
    } else {
      for (const to of game.board.alleyMates[pos]) next.add(to);
    }
  }
  return Math.min(next.size, 25) * 1.5;
}

// 깊이 제한 탐색: 잭은 최선 수를 고르고, 경찰은 "잭의 실제 위치를 아는" 비관적 모델로
// 매 턴 2칸씩 접근한다고 가정한다. depth가 클수록(보통 난이도) 몇 수 앞의 포위망을 내다본다.
function evaluateMove(game, cand, movesUsed, coaches, alleys, patrols, depth) {
  const { board, jack } = game;
  const pos = cand.to;
  const movesAfter = movesUsed + 1;
  const coachesAfter = coaches - (cand.type === 'coach' ? 1 : 0);
  const alleysAfter = alleys - (cand.type === 'alley' ? 1 : 0);

  // 은신처 도착 = 이번 밤 생존 확정
  if (pos === jack.hideout) {
    const earlyPenalty = game.night < 4 ? Math.max(0, 6 - movesAfter) * 25 : 0;
    return 900 - earlyPenalty;
  }

  const dHide = board.circleDist[pos][jack.hideout];
  const remaining = MOVES_PER_NIGHT - movesAfter;
  if (dHide > remaining) return -5000; // 새벽까지 못 돌아감

  const w = weights(game);
  let score = 0;
  const slack = remaining - dHide;
  // 여유가 줄어들수록 급격히 불안해진다 — 새벽 검거 방지가 최우선
  if (slack >= 3) score += 24;
  else if (slack === 2) score += 10;
  else if (slack === 1) score -= 50;
  else score -= 140;
  // 밤이 깊어지면(9번째 이동 이후) 은신처 쪽으로 꾸준히 압박
  if (movesAfter >= 9) score -= dHide * (movesAfter - 8) * 1.5 * w.homingW;

  // 경찰이 다가온 뒤의 위험도 — 단, 귀가가 급하면 위험을 감수한다
  // 어려움(beliefModel): 경찰은 잭의 실제 위치가 아니라 "추정 위치 집합"만 안다고
  // 가정하고 접근을 예측 — 과잉 공포 없이 진짜 위험한 수만 피하게 된다
  const dangerScale = (slack <= 2 ? 0.45 : 1) * w.dangerW * (game.diff.dangerMul ?? 1);
  const level = Math.max(1, game.diff.maxDepth) - depth; // 0 = 루트 후보 평가
  const advanced = game._patrolsByLevel
    ? game._patrolsByLevel[Math.min(level, game._patrolsByLevel.length - 1)]
    : advancePatrols(board, patrols, pos);
  for (const p of advanced) {
    const cd = Math.min(
      board.crossingDist[p.crossing][board.circles[pos].a],
      board.crossingDist[p.crossing][board.circles[pos].b],
    );
    if (cd === 0) score -= 120 * dangerScale; // 체포 사정권
    else if (cd === 1) score -= 40 * dangerScale;
    else if (cd === 2) score -= 12 * dangerScale;
  }

  // 단서가 찍힌 곳/이미 지나온 곳 회피
  if (game.cluesPos.has(pos)) score -= 30 * w.ambW;
  if (jack.path.includes(pos)) score -= 12;

  // 특수 이동은 자원 — 위급하지 않으면 아낀다. 마지막 마차는 탈출용으로 비축.
  if (cand.type === 'coach') score -= (coaches === 1 && movesAfter < 9 ? 80 : 28) * w.saveW;
  if (cand.type === 'alley') score -= 22 * w.saveW;

  if (depth > 1) {
    const nextCands = feasibleMovesSim(game, pos, movesAfter, coachesAfter, alleysAfter, advanced);
    if (nextCands.length === 0) {
      score -= 400; // 다음 턴에 포위됨
    } else {
      let bestNext = -Infinity;
      for (const nc of nextCands) {
        const v = evaluateMove(game, nc, movesAfter, coachesAfter, alleysAfter, advanced, depth - 1);
        if (v > bestNext) bestNext = v;
      }
      score += 0.6 * bestNext;
    }
  }
  return score;
}

function feasibleMovesSim(game, pos, movesUsed, coaches, alleys, patrols) {
  const all = game.legalJackMoves(pos, coaches, alleys, patrols);
  const remainAfter = MOVES_PER_NIGHT - movesUsed - 1;
  return all.filter((m) => game.board.circleDist[m.to][game.jack.hideout] <= remainAfter);
}

// 비관적 경찰 모델: 각 순찰대가 잭 위치와 가장 가까워지는 방향으로 2칸 이동
function advancePatrols(board, patrols, jackPos) {
  const target = board.circles[jackPos];
  return patrols.map((p) => {
    let cur = p.crossing;
    for (let step = 0; step < 2; step++) {
      let bestN = cur;
      let bestD = Math.min(board.crossingDist[cur][target.a], board.crossingDist[cur][target.b]);
      for (const n of board.crossingAdj[cur]) {
        const d = Math.min(board.crossingDist[n][target.a], board.crossingDist[n][target.b]);
        if (d < bestD) { bestD = d; bestN = n; }
      }
      cur = bestN;
    }
    return { crossing: cur };
  });
}

// 현실적 경찰 모델(어려움): 순찰대는 잭의 실제 위치가 아니라 공개 정보로 계산되는
// 추정 위치 집합(belief) 중 가장 가까운 지점으로 접근한다고 가정
function advancePatrolsBelief(board, patrols, belief) {
  const beliefDist = (crossing) => {
    let m = Infinity;
    for (const b of belief) {
      const c = board.circles[b];
      const d = Math.min(board.crossingDist[crossing][c.a], board.crossingDist[crossing][c.b]);
      if (d < m) m = d;
    }
    return m;
  };
  return patrols.map((p) => {
    let cur = p.crossing;
    for (let step = 0; step < 2; step++) {
      let bestN = cur, bestD = beliefDist(cur);
      for (const n of board.crossingAdj[cur]) {
        const d = beliefDist(n);
        if (d < bestD) { bestD = d; bestN = n; }
      }
      cur = bestN;
    }
    return { crossing: cur };
  });
}
