const STATE = new WeakMap();

function stateFor(game) {
  let state = STATE.get(game);
  if (!state) {
    state = { hideoutCandidates: null };
    STATE.set(game, state);
  }
  return state;
}

function intersect(left, right) {
  if (!left) return new Set(right);
  const out = new Set();
  for (const value of left) if (right.has(value)) out.add(value);
  return out.size > 0 ? out : new Set(right);
}

function distanceFromCrossing(board, crossing, circles) {
  let best = Infinity;
  for (const circleId of circles) {
    const circle = board.circles[circleId];
    best = Math.min(
      best,
      board.crossingDist[crossing][circle.a],
      board.crossingDist[crossing][circle.b],
    );
  }
  return best;
}

function targetScore(game, crossing, belief, hideouts, assigned) {
  const adjacent = game.board.circlesAt[crossing];
  const adjacentBelief = adjacent.filter((circle) => belief.has(circle)).length;
  const adjacentHideouts = hideouts
    ? adjacent.filter((circle) => hideouts.has(circle)).length
    : 0;
  const nearest = distanceFromCrossing(game.board, crossing, belief);
  let diversityPenalty = 0;
  for (const other of assigned) {
    const distance = game.board.crossingDist[crossing][other];
    if (distance === 0) diversityPenalty += 120;
    else if (distance === 1) diversityPenalty += 35;
  }
  return adjacentBelief * 100 + adjacentHideouts * 18 - nearest * 14 - diversityPenalty;
}

function assignTargets(game, belief, hideouts) {
  const assigned = [];
  const targets = new Map();
  for (const patrol of game.patrols) {
    const options = new Set([patrol.crossing, ...game.patrolReachable(patrol)]);
    let best = patrol.crossing;
    let bestScore = -Infinity;
    for (const crossing of options) {
      const score = targetScore(game, crossing, belief, hideouts, assigned);
      if (score > bestScore || (score === bestScore && crossing < best)) {
        best = crossing;
        bestScore = score;
      }
    }
    targets.set(patrol.id, best);
    assigned.push(best);
  }
  return targets;
}

// 현재 위치 후보만으로는 수색의 경로 이력을 완전히 복원할 수 없다. 살인지에서 각 후보까지의
// 최단 경로가 해당 지점을 지나는지를 양분 근사치로 사용해 positive/negative가 가장 균형적인
// 지점을 고른다.
function informationGain(game, circleId, belief) {
  if (belief.size <= 1) return 0;
  const murder = game.jack.path[0];
  let positive = 0;
  for (const candidate of belief) {
    if (
      game.board.circleDist[murder][candidate]
      === game.board.circleDist[murder][circleId] + game.board.circleDist[circleId][candidate]
    ) {
      positive++;
    }
  }
  return Math.min(positive, belief.size - positive);
}

function chooseSearch(game, adjacent, belief, searched) {
  let best = null;
  let bestScore = -Infinity;
  for (const circle of adjacent) {
    if (searched.has(circle)) continue;
    const score = informationGain(game, circle, belief) * 10
      + (belief.has(circle) ? 8 : 0)
      - (game.cluesPos.has(circle) ? 5 : 0);
    if (score > bestScore || (score === bestScore && (best === null || circle < best))) {
      best = circle;
      bestScore = score;
    }
  }
  return best ?? adjacent[0];
}

export const smartPolice = {
  key: 'smart',
  name: 'Belief Smart',

  beginGame(game) {
    STATE.set(game, { hideoutCandidates: null });
  },

  endNight(game) {
    const state = stateFor(game);
    state.hideoutCandidates = intersect(state.hideoutCandidates, game.computeBelief());
  },

  takeTurn(game) {
    const state = stateFor(game);
    const belief = game.computeBelief();
    const targets = assignTargets(game, belief, state.hideoutCandidates);

    for (const patrol of game.patrols) {
      const target = targets.get(patrol.id);
      if (target !== patrol.crossing) game.movePatrol(patrol.id, target);
    }

    const attempted = new Set();
    const searched = new Set();
    for (const patrol of game.patrols) {
      if (game.phase === 'gameOver') return;
      const currentBelief = game.computeBelief();
      const adjacent = game.patrolAdjacentCircles(patrol);
      const candidates = adjacent.filter((circle) => currentBelief.has(circle) && !attempted.has(circle));

      if (candidates.length > 0 && candidates.length <= 2) {
        const hideouts = state.hideoutCandidates;
        const circle = candidates.find((candidate) => hideouts?.has(candidate)) ?? candidates[0];
        attempted.add(circle);
        game.policeAction(patrol.id, 'arrest', circle);
      } else {
        // 수색은 규칙상 인접 지점 전체를 번호 순서로 훑는다 (지점 지정 불필요)
        const circle = chooseSearch(game, adjacent, currentBelief, searched);
        searched.add(circle);
        game.policeAction(patrol.id, 'search');
      }
    }
    game.endPoliceTurn();
  },
};
