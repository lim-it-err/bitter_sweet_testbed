import test from 'node:test';
import assert from 'node:assert/strict';

import { generateBoard } from '../whitechapel/js/board.js';
import { decideJackMove, PERSONAS } from '../whitechapel/js/ai.js';
import { Game, MOVES_PER_NIGHT, NIGHTS } from '../whitechapel/js/game.js';

function makeGame(difficulty = 'easy', seed = 18881109) {
  return new Game(generateBoard(seed), difficulty);
}

function setPoliceActionState(game, circleId, jackPath) {
  const patrol = game.patrols[0];
  patrol.crossing = game.board.circles[circleId].a;
  patrol.acted = false;
  game.phase = 'police';
  game.jack.path = [...jackPath];
  game.jack.pos = jackPath.at(-1);
  game.jack.movesUsed = Math.max(0, jackPath.length - 1);
  return patrol;
}

function findTwoStepRoute(board) {
  for (const [from, firstEdges] of board.circleAdj.entries()) {
    for (const { to: mid } of firstEdges) {
      const second = board.circleAdj[mid].find(({ to }) => to !== from);
      if (second) return { from, mid, to: second.to, blockedVia: firstEdges.find((e) => e.to === mid).via };
    }
  }
  throw new Error('two-step route not found');
}

test('normal Jack movement cannot pass an occupied crossing', () => {
  const game = makeGame();
  const from = 0;
  const edge = game.board.circleAdj[from][0];
  const moves = game.legalJackMoves(from, 0, 0, [{ crossing: edge.via }]);
  assert.ok(!moves.some((move) => move.type === 'move' && move.to === edge.to));
});

test('coach movement can pass an occupied crossing', () => {
  const game = makeGame();
  const route = findTwoStepRoute(game.board);
  const moves = game.legalJackMoves(route.from, 1, 0, [{ crossing: route.blockedVia }]);
  assert.ok(moves.some((move) => move.type === 'coach' && move.mid === route.mid && move.to === route.to));
});

test('coach destinations contain no duplicates', () => {
  const game = makeGame();
  const coachMoves = game.legalJackMoves(0, 1, 0, []).filter((move) => move.type === 'coach');
  assert.equal(new Set(coachMoves.map((move) => move.to)).size, coachMoves.length);
});

test('alley moves exactly match the generated alley mates', () => {
  const game = makeGame();
  const from = game.board.alleyMates.findIndex((mates) => mates.length > 0);
  const alleyTargets = game.legalJackMoves(from, 0, 1, [])
    .filter((move) => move.type === 'alley')
    .map((move) => move.to)
    .sort((a, b) => a - b);
  assert.deepEqual(alleyTargets, [...game.board.alleyMates[from]].sort((a, b) => a - b));
});

test('search finds a clue on Jack path', () => {
  const game = makeGame();
  const circle = 0;
  setPoliceActionState(game, circle, [circle]);
  assert.equal(game.policeAction(0, 'search', circle), true);
  assert.ok(game.cluesPos.has(circle));
  assert.ok(!game.cluesNeg.has(circle));
});

test('search records a negative result away from Jack path', () => {
  const game = makeGame();
  const searched = 0;
  const actual = game.board.circleAdj[searched][0].to;
  setPoliceActionState(game, searched, [actual]);
  assert.equal(game.policeAction(0, 'search', searched), true);
  assert.ok(game.cluesNeg.has(searched));
  assert.deepEqual(game.negHistory, [{ circle: searched, atMove: 0 }]);
});

test('arrest at Jack current position ends the game for police', () => {
  const game = makeGame();
  const circle = 0;
  setPoliceActionState(game, circle, [circle]);
  assert.equal(game.policeAction(0, 'arrest', circle), true);
  assert.equal(game.phase, 'gameOver');
  assert.equal(game.winner, 'police');
});

test('failed arrest is recorded without ending the game', () => {
  const game = makeGame();
  const arrested = 0;
  const actual = game.board.circleAdj[arrested][0].to;
  setPoliceActionState(game, arrested, [actual]);
  assert.equal(game.policeAction(0, 'arrest', arrested), true);
  assert.equal(game.phase, 'police');
  assert.equal(game.winner, null);
  assert.deepEqual(game.arrestFails, [{ circle: arrested, atMove: 0 }]);
});

test('police action rejects a non-adjacent circle', () => {
  const game = makeGame();
  const patrol = game.patrols[0];
  patrol.crossing = 0;
  patrol.acted = false;
  game.phase = 'police';
  const nonAdjacent = game.board.circles.find((circle) => circle.a !== 0 && circle.b !== 0).id;
  assert.equal(game.policeAction(0, 'search', nonAdjacent), false);
  assert.equal(patrol.acted, false);
});

test('a patrol cannot finish on another patrol position', () => {
  const game = makeGame();
  const first = game.patrols[0];
  const second = game.patrols[1];
  first.crossing = 0;
  second.crossing = game.board.crossingAdj[0][0];
  first.stepsLeft = 2;
  assert.ok(!game.patrolReachable(first).has(second.crossing));
});

test('movePatrol accepts a reachable unoccupied crossing', () => {
  const game = makeGame();
  const patrol = game.patrols[0];
  patrol.crossing = 0;
  patrol.stepsLeft = 1;
  game.phase = 'police';
  const occupied = new Set(game.patrols.slice(1).map((item) => item.crossing));
  const target = game.board.crossingAdj[0].find((crossing) => !occupied.has(crossing));
  assert.equal(game.movePatrol(0, target), true);
  assert.equal(patrol.crossing, target);
  assert.equal(patrol.stepsLeft, 0);
});

test('endNight stores the path and enters the between-night phase', () => {
  const game = makeGame();
  game.night = 1;
  game.jack.path = [1, 2, 3];
  game.endNight();
  assert.equal(game.phase, 'nightEnd');
  assert.deepEqual(game.allPaths, [[1, 2, 3]]);
});

test('ending the fourth night gives Jack the game', () => {
  const game = makeGame();
  game.night = NIGHTS;
  game.jack.path = [1, 2];
  game.endNight();
  assert.equal(game.phase, 'gameOver');
  assert.equal(game.winner, 'jack');
});

test('the fifteenth move away from hideout causes dawn arrest', async () => {
  const game = makeGame();
  const from = 0;
  const to = game.board.circleAdj[from][0].to;
  const hideout = game.board.circles.find((circle) => circle.id !== from && circle.id !== to).id;
  game.night = 1;
  game.phase = 'jack';
  game.jack.pos = from;
  game.jack.hideout = hideout;
  game.jack.path = [from];
  game.jack.movesUsed = MOVES_PER_NIGHT - 1;
  game.jack.coaches = 0;
  game.jack.alleys = 0;
  game.computeBelief = () => new Set([from]);
  game.legalJackMoves = () => [{ type: 'move', to, mid: null }];
  await game.jackTurn();
  assert.equal(game.phase, 'gameOver');
  assert.equal(game.winner, 'police');
  assert.equal(game.jack.movesUsed, MOVES_PER_NIGHT);
});

test('coach use decrements its resource and records both path circles', async () => {
  const game = makeGame();
  const route = findTwoStepRoute(game.board);
  game.night = 1;
  game.phase = 'jack';
  game.jack.pos = route.from;
  game.jack.hideout = route.to;
  game.jack.path = [route.from];
  game.legalJackMoves = () => [{ type: 'coach', to: route.to, mid: route.mid }];
  await game.jackTurn();
  assert.equal(game.jack.coaches, 2);
  assert.deepEqual(game.jack.path, [route.from, route.mid, route.to]);
  assert.deepEqual(game.declared, ['coach']);
});

test('alley use decrements its resource', async () => {
  const game = makeGame();
  const from = game.board.alleyMates.findIndex((mates) => mates.length > 0);
  const to = game.board.alleyMates[from][0];
  game.night = 1;
  game.phase = 'jack';
  game.jack.pos = from;
  game.jack.hideout = to;
  game.jack.path = [from];
  game.legalJackMoves = () => [{ type: 'alley', to, mid: null }];
  await game.jackTurn();
  assert.equal(game.jack.alleys, 1);
  assert.deepEqual(game.declared, ['alley']);
});

test('belief is empty before the first night', () => {
  assert.deepEqual(makeGame().computeBelief(), new Set());
});

test('belief follows a normal declared move', () => {
  const game = makeGame();
  const from = 0;
  const to = game.board.circleAdj[from][0].to;
  game.night = 1;
  game.jack.path = [from, to];
  game.jack.pos = to;
  game.jack.movesUsed = 1;
  game.declared = ['move'];
  assert.ok(game.computeBelief().has(to));
});

test('belief follows coach and alley declarations', () => {
  const game = makeGame();
  const route = findTwoStepRoute(game.board);
  game.night = 1;
  game.jack.path = [route.from, route.mid, route.to];
  game.jack.pos = route.to;
  game.jack.movesUsed = 1;
  game.declared = ['coach'];
  assert.ok(game.computeBelief().has(route.to));

  const alleyFrom = game.board.alleyMates.findIndex((mates) => mates.length > 0);
  const alleyTo = game.board.alleyMates[alleyFrom][0];
  game.jack.path = [alleyFrom, alleyTo];
  game.jack.pos = alleyTo;
  game.declared = ['alley'];
  assert.ok(game.computeBelief().has(alleyTo));
});

test('negative search and failed arrest remove impossible belief positions', () => {
  const game = makeGame();
  const from = 0;
  const targets = game.board.circleAdj[from].slice(0, 2).map(({ to }) => to);
  assert.equal(targets.length, 2);
  game.night = 1;
  game.jack.path = [from, targets[0]];
  game.jack.movesUsed = 1;
  game.declared = ['move'];
  game.negHistory = [{ circle: targets[0], atMove: 1 }];
  game.arrestFails = [{ circle: targets[1], atMove: 1 }];
  const belief = game.computeBelief();
  assert.ok(!belief.has(targets[0]));
  assert.ok(!belief.has(targets[1]));
});

test('belief contains the actual position throughout a simulated path', () => {
  const game = makeGame();
  game.night = 1;
  game.patrols = [];
  game.jack.pos = 0;
  game.jack.path = [0];
  game.jack.movesUsed = 0;
  game.declared = [];

  for (let turn = 0; turn < 10; turn++) {
    const move = game.legalJackMoves(game.jack.pos, game.jack.coaches, game.jack.alleys, [])[turn % 3];
    assert.ok(move, `missing move at turn ${turn}`);
    if (move.type === 'coach') {
      game.jack.coaches--;
      game.jack.path.push(move.mid, move.to);
    } else {
      if (move.type === 'alley') game.jack.alleys--;
      game.jack.path.push(move.to);
    }
    game.jack.pos = move.to;
    game.jack.movesUsed++;
    game.declared.push(move.type);
    assert.ok(game.computeBelief().has(game.jack.pos), `actual position lost at turn ${turn + 1}`);
  }
});

test('decideJackMove returns one of the current legal moves', async () => {
  const game = makeGame('easy');
  game.night = 1;
  game.jack.pos = 0;
  game.jack.path = [0];
  game.jack.hideout = game.board.circleAdj[0][0].to;
  game.patrols = [];
  const legal = game.legalJackMoves();
  const chosen = await decideJackMove(game);
  assert.ok(legal.some((move) => (
    move.type === chosen.type && move.to === chosen.to && move.mid === chosen.mid
  )));
});

test('decideJackMove preserves the late-game hideout slack invariant', async () => {
  const game = makeGame('easy');
  const from = 0;
  const hideout = game.board.circleAdj[from][0].to;
  game.night = 1;
  game.patrols = [];
  game.jack.pos = from;
  game.jack.path = [from];
  game.jack.hideout = hideout;
  game.jack.movesUsed = MOVES_PER_NIGHT - 1;
  game.jack.coaches = 0;
  game.jack.alleys = 0;
  const chosen = await decideJackMove(game);
  assert.equal(chosen.to, hideout);
  assert.equal(game.board.circleDist[chosen.to][hideout], 0);
});

test('hard difficulty personas expose all required scoring weights', () => {
  assert.equal(PERSONAS.length, 3);
  for (const persona of PERSONAS) {
    for (const key of ['ambW', 'dangerW', 'homingW', 'saveW']) {
      assert.equal(typeof persona[key], 'number');
      assert.ok(persona[key] > 0);
    }
  }
});
