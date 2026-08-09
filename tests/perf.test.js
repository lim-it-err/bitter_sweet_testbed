import test from 'node:test';
import assert from 'node:assert/strict';

import { benchmarkDifficulty } from '../sim/benchmark.mjs';

test('hard Jack decision time stays within the browser budget', { timeout: 30_000 }, async () => {
  const result = await benchmarkDifficulty({ difficulty: 'hard', games: 3, seed: 18881109 });

  assert.ok(result.jack.samples > 0, 'benchmark produced no Jack decisions');
  assert.ok(
    result.jack.averageMs <= 50,
    `hard Jack average ${result.jack.averageMs.toFixed(2)}ms exceeded 50ms`,
  );
  assert.ok(
    result.jack.worstMs <= 200,
    `hard Jack worst ${result.jack.worstMs.toFixed(2)}ms exceeded 200ms`,
  );
});
