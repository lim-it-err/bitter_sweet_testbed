import { MOVES_PER_NIGHT } from '../../whitechapel/js/game.js';

const MAX_BELIEF = 24;
const EXPLORATION = Math.SQRT2;

function key(move) {
  return `${move.type}:${move.mid ?? '-'}:${move.to}`;
}

function cloneState(state) {
  return {
    pos: state.pos,
    movesUsed: state.movesUsed,
    coaches: state.coaches,
    alleys: state.alleys,
    patrols: [...state.patrols],
    belief: [...state.belief],
    terminal: state.terminal,
    reward: state.reward,
  };
}

function legalMoves(game, state) {
  const occupied = new Set(state.patrols);
  const moves = [];
  for (const { to, via } of game.board.circleAdj[state.pos]) {
    if (!occupied.has(via)) moves.push({ type: 'move', to, mid: null });
  }
  if (state.coaches > 0) {
    const seen = new Set();
    for (const { to: mid } of game.board.circleAdj[state.pos]) {
      for (const { to } of game.board.circleAdj[mid]) {
        if (to === state.pos || seen.has(to)) continue;
        seen.add(to);
        moves.push({ type: 'coach', to, mid });
      }
    }
  }
  if (state.alleys > 0) {
    for (const to of game.board.alleyMates[state.pos]) moves.push({ type: 'alley', to, mid: null });
  }
  const remaining = MOVES_PER_NIGHT - state.movesUsed - 1;
  const feasible = moves.filter((move) => game.board.circleDist[move.to][game.jack.hideout] <= remaining);
  return feasible.length > 0 ? feasible : moves;
}

function advanceBelief(game, belief, type, actual, rng) {
  const next = new Set([actual]);
  for (const pos of belief) {
    if (type === 'move') {
      for (const { to } of game.board.circleAdj[pos]) next.add(to);
    } else if (type === 'coach') {
      for (const { to: mid } of game.board.circleAdj[pos]) {
        for (const { to } of game.board.circleAdj[mid]) if (to !== pos) next.add(to);
      }
    } else {
      for (const to of game.board.alleyMates[pos]) next.add(to);
    }
  }
  const values = [...next];
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  const sampled = values.slice(0, MAX_BELIEF);
  if (!sampled.includes(actual)) sampled[sampled.length - 1] = actual;
  return sampled;
}

function distanceToCircle(board, crossing, circleId) {
  const circle = board.circles[circleId];
  return Math.min(board.crossingDist[crossing][circle.a], board.crossingDist[crossing][circle.b]);
}

function movePatrols(game, patrols, belief, rng) {
  const board = game.board;
  const candidates = [...belief];
  const offset = candidates.length === 0 ? 0 : Math.floor(rng() * candidates.length);
  const claimed = new Set();
  const occupied = new Set(patrols);
  return patrols.map((start, patrolIndex) => {
    let target = candidates[(offset + patrolIndex) % candidates.length];
    let targetDistance = target === undefined ? Infinity : distanceToCircle(board, start, target);
    for (const candidate of candidates) {
      if (claimed.has(candidate)) continue;
      const distance = distanceToCircle(board, start, candidate);
      if (distance < targetDistance) {
        target = candidate;
        targetDistance = distance;
      }
    }
    if (target === undefined) return start;
    claimed.add(target);
    let crossing = start;
    occupied.delete(start);
    for (let step = 0; step < 2; step++) {
      let best = crossing;
      let bestDistance = distanceToCircle(board, crossing, target);
      for (const adjacent of board.crossingAdj[crossing]) {
        const distance = distanceToCircle(board, adjacent, target);
        if (!occupied.has(adjacent) && distance < bestDistance) {
          best = adjacent;
          bestDistance = distance;
        }
      }
      crossing = best;
    }
    occupied.add(crossing);
    return crossing;
  });
}

function policeCaptures(game, state, rng) {
  for (const crossing of state.patrols) {
    const adjacent = game.board.circlesAt[crossing];
    const candidates = adjacent.filter((circle) => state.belief.includes(circle));
    if (candidates.length > 0 && candidates.length <= 2 && candidates.includes(state.pos)) {
      if (candidates.length === 1 || rng() < 1 / candidates.length) return true;
    }
  }
  return false;
}

function transition(game, current, move, rng) {
  const state = cloneState(current);
  state.pos = move.to;
  state.movesUsed++;
  if (move.type === 'coach') state.coaches--;
  if (move.type === 'alley') state.alleys--;
  state.belief = advanceBelief(game, state.belief, move.type, state.pos, rng);
  if (state.pos === game.jack.hideout) {
    state.terminal = true;
    state.reward = 1;
    return state;
  }
  if (state.movesUsed >= MOVES_PER_NIGHT) {
    state.terminal = true;
    state.reward = -1;
    return state;
  }
  state.patrols = movePatrols(game, state.patrols, state.belief, rng);
  if (policeCaptures(game, state, rng)) {
    state.terminal = true;
    state.reward = -1;
  }
  return state;
}

function rolloutMove(game, state, moves, rng) {
  let bestScore = -Infinity;
  let best = [];
  for (const move of moves) {
    const home = game.board.circleDist[move.to][game.jack.hideout];
    let danger = Infinity;
    const circle = game.board.circles[move.to];
    for (const patrol of state.patrols) {
      danger = Math.min(
        danger,
        game.board.crossingDist[patrol][circle.a],
        game.board.crossingDist[patrol][circle.b],
      );
    }
    const special = move.type === 'move' ? 0 : 1.5;
    const score = -home * 3 + Math.min(danger, 4) * 2 - special;
    if (score > bestScore) {
      bestScore = score;
      best = [move];
    } else if (score === bestScore) {
      best.push(move);
    }
  }
  return best[Math.floor(rng() * best.length)];
}

class Node {
  constructor(state, parent = null, move = null, game = null) {
    this.state = state;
    this.parent = parent;
    this.move = move;
    this.children = [];
    this.untried = state.terminal ? [] : legalMoves(game, state);
    this.visits = 0;
    this.value = 0;
  }

  select() {
    let best = this.children[0];
    let bestScore = -Infinity;
    for (const child of this.children) {
      const mean = child.value / child.visits;
      const score = mean + EXPLORATION * Math.sqrt(Math.log(this.visits) / child.visits);
      if (score > bestScore) {
        best = child;
        bestScore = score;
      }
    }
    return best;
  }
}

export function chooseMctsMove(game, { rng = Math.random, playouts = 500 } = {}) {
  const legal = game.legalJackMoves();
  if (legal.length === 0) return null;
  const publicBelief = [...game.computeBelief()];
  const rootState = {
    pos: game.jack.pos,
    movesUsed: game.jack.movesUsed,
    coaches: game.jack.coaches,
    alleys: game.jack.alleys,
    patrols: game.patrols.map((patrol) => patrol.crossing),
    belief: publicBelief.length > 0 ? publicBelief.slice(0, MAX_BELIEF) : [game.jack.pos],
    terminal: false,
    reward: 0,
  };
  const root = new Node(rootState, null, null, game);

  for (let iteration = 0; iteration < playouts; iteration++) {
    let node = root;
    let state = cloneState(rootState);

    while (!state.terminal && node.untried.length === 0 && node.children.length > 0) {
      node = node.select();
      state = transition(game, state, node.move, rng);
    }
    if (!state.terminal && node.untried.length > 0) {
      const index = Math.floor(rng() * node.untried.length);
      const [move] = node.untried.splice(index, 1);
      state = transition(game, state, move, rng);
      const child = new Node(state, node, move, game);
      node.children.push(child);
      node = child;
    }
    while (!state.terminal) {
      const moves = legalMoves(game, state);
      if (moves.length === 0) {
        state.terminal = true;
        state.reward = -1;
        break;
      }
      state = transition(game, state, rolloutMove(game, state, moves, rng), rng);
    }
    while (node) {
      node.visits++;
      node.value += state.reward;
      node = node.parent;
    }
  }

  root.children.sort((left, right) => (
    right.visits - left.visits
    || (right.value / right.visits) - (left.value / left.visits)
    || key(left.move).localeCompare(key(right.move))
  ));
  return root.children[0]?.move ?? legal[0];
}

export const mctsJack = {
  key: 'mcts',
  chooseMove: chooseMctsMove,
};
