import test from 'node:test';
import assert from 'node:assert/strict';

import { generateBoard, mulberry32 } from '../whitechapel/js/board.js';

const board = generateBoard(18881109);

test('mulberry32 produces the same sequence for the same seed', () => {
  const left = mulberry32(42);
  const right = mulberry32(42);
  assert.deepEqual(Array.from({ length: 20 }, left), Array.from({ length: 20 }, right));
});

test('board generation is deterministic for the same seed', () => {
  assert.deepEqual(generateBoard(20260809), generateBoard(20260809));
});

test('different seeds produce different board coordinates', () => {
  const first = generateBoard(1).crossings.map(({ x, y }) => [x, y]);
  const second = generateBoard(2).crossings.map(({ x, y }) => [x, y]);
  assert.notDeepEqual(first, second);
});

test('the circle graph is connected', () => {
  const seen = new Set([0]);
  const queue = [0];
  for (let i = 0; i < queue.length; i++) {
    for (const { to } of board.circleAdj[queue[i]]) {
      if (!seen.has(to)) {
        seen.add(to);
        queue.push(to);
      }
    }
  }
  assert.equal(seen.size, board.circles.length);
});

test('every crossing has degree at least two', () => {
  for (const [crossing, adjacent] of board.crossingAdj.entries()) {
    assert.ok(adjacent.length >= 2, `crossing ${crossing} has degree ${adjacent.length}`);
  }
});

test('circle adjacency is reciprocal and keeps the same crossing', () => {
  for (const [from, adjacent] of board.circleAdj.entries()) {
    for (const { to, via } of adjacent) {
      assert.ok(
        board.circleAdj[to].some((edge) => edge.to === from && edge.via === via),
        `${from} -> ${to} via ${via} is not reciprocal`,
      );
    }
  }
});

test('circlesAt agrees with each circle endpoint', () => {
  for (const circle of board.circles) {
    assert.ok(board.circlesAt[circle.a].includes(circle.id));
    assert.ok(board.circlesAt[circle.b].includes(circle.id));
  }
});

test('alley relationships are symmetric', () => {
  for (const [from, mates] of board.alleyMates.entries()) {
    for (const to of mates) {
      assert.ok(board.alleyMates[to].includes(from), `${from} and ${to} are not symmetric`);
    }
  }
});

test('circle distance matrix is finite, diagonal-zero, and symmetric', () => {
  for (let i = 0; i < board.circleDist.length; i++) {
    assert.equal(board.circleDist[i][i], 0);
    for (let j = 0; j < board.circleDist.length; j++) {
      assert.ok(Number.isFinite(board.circleDist[i][j]));
      assert.equal(board.circleDist[i][j], board.circleDist[j][i]);
    }
  }
});

test('crossing distance matrix is finite, diagonal-zero, and symmetric', () => {
  for (let i = 0; i < board.crossingDist.length; i++) {
    assert.equal(board.crossingDist[i][i], 0);
    for (let j = 0; j < board.crossingDist.length; j++) {
      assert.ok(Number.isFinite(board.crossingDist[i][j]));
      assert.equal(board.crossingDist[i][j], board.crossingDist[j][i]);
    }
  }
});

test('there are ten unique valid murder sites', () => {
  assert.equal(board.murderSites.length, 10);
  assert.equal(new Set(board.murderSites).size, 10);
  for (const site of board.murderSites) assert.ok(board.circles[site]);
});

test('there are six unique valid police starts', () => {
  assert.equal(board.policeStarts.length, 5);
  assert.equal(new Set(board.policeStarts).size, 5);
  for (const crossing of board.policeStarts) assert.ok(board.crossings[crossing]);
});
