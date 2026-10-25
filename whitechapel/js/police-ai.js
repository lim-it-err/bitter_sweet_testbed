// AI 관전 모드용 경찰 AI — 공개 정보(추정 위치 집합)만 사용하는 공정한 정책.
// 잭의 실제 위치/은신처는 절대 참조하지 않는다.

// 경찰 AI 강도 — 잭 플레이 모드에서 난이도로 선택된다
// trackers: 추정 위치를 조직적으로 추적하는 순찰대 수(나머지는 자기 구역을 지키며 대기)
// arrestAt: 추정 집합이 이 크기 이하로 좁혀졌을 때만 체포 시도
export const POLICE_LEVELS = {
  easy: { trackers: 3, arrestAt: 1 },
  medium: { trackers: 4, arrestAt: 2 },
  hard: { trackers: 99, arrestAt: 3 },
};

export function policeLevel(game) {
  return POLICE_LEVELS[game.diff.key] ?? POLICE_LEVELS.hard;
}

// 순찰대별 목표 배정: 추정 위치 집합의 서로 다른 지점으로 분산 접근
function assignTargets(game, belief, trackers = 99) {
  const b = game.board;
  const targets = new Map(); // pid -> circleId
  const claimed = new Set();
  for (const p of game.patrols.slice(0, trackers)) {
    let best = null, bestD = Infinity;
    for (const c of belief) {
      if (claimed.has(c) && claimed.size < belief.length) continue;
      const d = Math.min(b.crossingDist[p.crossing][b.circles[c].a], b.crossingDist[p.crossing][b.circles[c].b]);
      if (d < bestD) { bestD = d; best = c; }
    }
    if (best !== null) { targets.set(p.id, best); claimed.add(best); }
  }
  return targets;
}

// 이동: 배정 목표에 가장 가까워지는 도달 가능 교차점
export function policeAiMove(game, patrol, targets) {
  const b = game.board;
  const target = targets.get(patrol.id);
  if (target === undefined || patrol.stepsLeft <= 0) return null;
  const tc = b.circles[target];
  const distTo = (cr) => Math.min(b.crossingDist[cr][tc.a], b.crossingDist[cr][tc.b]);
  let best = null, bestD = distTo(patrol.crossing);
  for (const cr of game.patrolReachable(patrol)) {
    const d = distTo(cr);
    if (d < bestD) { bestD = d; best = cr; }
  }
  return best;
}

// 행동: 추정 집합이 충분히 좁고 인접에 후보가 있으면 체포, 아니면 주변 수색
// (수색은 규칙상 인접 지점 전체를 단서가 나올 때까지 차례로 훑는다)
export function policeAiAction(game, patrol, belief) {
  if (patrol.acted) return null;
  const adj = game.patrolAdjacentCircles(patrol);
  if (adj.length === 0) return null;
  const inBelief = adj.filter((c) => belief.has(c));
  if (inBelief.length > 0 && belief.size <= policeLevel(game).arrestAt) {
    return { kind: 'arrest', circle: inBelief[0] };
  }
  return { kind: 'search' };
}

export function planPoliceTargets(game) {
  const belief = game.computeBelief();
  return { belief, targets: assignTargets(game, belief, policeLevel(game).trackers) };
}
