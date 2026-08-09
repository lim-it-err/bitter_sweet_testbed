import { performance } from 'node:perf_hooks';

import { decideJackMove } from '../whitechapel/js/ai.js';
import { DIFFICULTIES, simulateGame } from './engine.mjs';
import { smartPolice } from './police/smart.mjs';

function summarize(samples) {
  if (samples.length === 0) return { samples: 0, averageMs: 0, worstMs: 0 };
  return {
    samples: samples.length,
    averageMs: samples.reduce((sum, value) => sum + value, 0) / samples.length,
    worstMs: Math.max(...samples),
  };
}

function timedPolicies(timings) {
  const jack = {
    key: 'heuristic',
    async chooseMove(game) {
      const started = performance.now();
      try {
        return await decideJackMove(game);
      } finally {
        timings.jack.push(performance.now() - started);
      }
    },
  };

  const police = {
    key: smartPolice.key,
    beginGame(game, rng) {
      const computeBelief = game.computeBelief.bind(game);
      game.computeBelief = () => {
        const started = performance.now();
        try {
          return computeBelief();
        } finally {
          timings.belief.push(performance.now() - started);
        }
      };
      smartPolice.beginGame?.(game, rng);
    },
    endNight: (game, rng) => smartPolice.endNight?.(game, rng),
    endGame: (game, rng) => smartPolice.endGame?.(game, rng),
    takeTurn(game, rng) {
      const started = performance.now();
      try {
        return smartPolice.takeTurn(game, rng);
      } finally {
        timings.police.push(performance.now() - started);
      }
    },
  };

  return { jack, police };
}

export async function benchmarkDifficulty({
  difficulty,
  games = 3,
  seed = 18881109,
} = {}) {
  if (!DIFFICULTIES.includes(difficulty)) throw new Error(`unknown difficulty: ${difficulty}`);
  if (!Number.isInteger(games) || games < 1) throw new Error('games must be a positive integer');
  if (!Number.isInteger(seed)) throw new Error('seed must be an integer');

  const timings = { jack: [], belief: [], police: [] };
  const { jack, police } = timedPolicies(timings);
  const started = performance.now();
  for (let gameIndex = 0; gameIndex < games; gameIndex++) {
    await simulateGame({ difficulty, jack, police, seed, gameIndex });
  }

  return {
    difficulty,
    games,
    seed,
    jack: summarize(timings.jack),
    belief: summarize(timings.belief),
    police: summarize(timings.police),
    elapsedMs: performance.now() - started,
  };
}

export async function benchmarkAll(options = {}) {
  const difficulties = options.difficulties ?? DIFFICULTIES;
  const results = [];
  for (const difficulty of difficulties) {
    results.push(await benchmarkDifficulty({ ...options, difficulty }));
  }
  return results;
}

function duration(value) {
  return `${value.toFixed(2)}ms`;
}

export function formatBenchmarkMarkdown(results) {
  const lines = [
    '| 난이도 | 측정 항목 | 표본 | 평균 | 최악 |',
    '|---|---|---:|---:|---:|',
  ];
  for (const result of results) {
    lines.push(`| ${result.difficulty} | 잭 결정 | ${result.jack.samples} | ${duration(result.jack.averageMs)} | ${duration(result.jack.worstMs)} |`);
    lines.push(`| ${result.difficulty} | belief 계산 | ${result.belief.samples} | ${duration(result.belief.averageMs)} | ${duration(result.belief.worstMs)} |`);
    lines.push(`| ${result.difficulty} | smart 경찰 턴 | ${result.police.samples} | ${duration(result.police.averageMs)} | ${duration(result.police.worstMs)} |`);
  }
  return lines.join('\n');
}
