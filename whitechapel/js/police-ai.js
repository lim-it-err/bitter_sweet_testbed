// AI 관전 모드용 경찰 AI — 공개 정보(추정 위치 집합)만 사용하는 공정한 정책.
// 잭의 실제 위치/은신처는 절대 참조하지 않는다.

// 순찰대별 목표 배정: 추정 위치 집합의 서로 다른 지점으로 분산 접근
function assignTargets(game, belief) {
  const b = game.board;
  const targets = new Map(); // pid -> circleId
  const claimed = new Set();
  for (const p of game.patrols) {
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

// 행동: 추정 집합이 충분히 좁고 인접에 후보가 있으면 체포, 아니면 정보가 되는 수색
export function policeAiAction(game, patrol, belief) {
  if (patrol.acted) return null;
  const adj = game.patrolAdjacentCircles(patrol);
  if (adj.length === 0) return null;
  const inBelief = adj.filter((c) => belief.has(c));
  if (inBelief.length > 0 && belief.size <= 3) {
    return { kind: 'arrest', circle: inBelief[0] };
  }
  if (inBelief.length > 0) {
    // 아직 수색 안 한 후보 우선
    const fresh = inBelief.filter((c) => !game.cluesPos.has(c) && !game.cluesNeg.has(c));
    return { kind: 'search', circle: (fresh[0] ?? inBelief[0]) };
  }
  // 인접에 후보가 없으면 추정 집합에 가장 가까운 지점을 수색(경로 단서 노림)
  const b = game.board;
  let best = adj[0], bestD = Infinity;
  for (const c of adj) {
    for (const bl of belief) {
      const d = b.circleDist[c][bl];
      if (d < bestD) { bestD = d; best = c; }
    }
  }
  return { kind: 'search', circle: best };
}

export function planPoliceTargets(game) {
  const belief = game.computeBelief();
  return { belief, targets: assignTargets(game, belief) };
}
