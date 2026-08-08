import { performance } from 'node:perf_hooks';

import { mulberry32, generateBoard } from '../whitechapel/js/board.js';
import { Game } from '../whitechapel/js/game.js';
import { randomPolice } from './police/random.mjs';
import { smartPolice } from './police/smart.mjs';

export const DIFFICULTIES = ['easy', 'medium', 'hard'];

const POLICIES = new Map([
  [randomPolice.key, randomPolice],
  [smartPolice.key, smartPolice],
]);

export function registerPolicePolicy(policy) {
  if (!policy?.key || typeof policy.takeTurn !== 'function') {
    throw new TypeError('police policy requires key and takeTurn(game, rng)');
  }
  POLICIES.set(policy.key, policy);
}

export function getPolicePolicy(key) {
  const policy = POLICIES.get(key);
  if (!policy) throw new Error(`unknown police policy: ${key}`);
  return policy;
}

export function listPolicePolicies() {
  return [...POLICIES.keys()];
}

function mixSeed(seed, gameIndex, difficulty, police) {
  let value = (seed ^ Math.imul(gameIndex + 1, 0x9e3779b1)) >>> 0;
  for (const char of `${difficulty}:${police}`) {
    value = Math.imul(value ^ char.charCodeAt(0), 0x85ebca6b) >>> 0;
  }
  return value;
}

function classifyGame(game) {
  if (game.winner === 'jack') return 'survived';
  const last = game.log.at(-1)?.msg ?? '';
  if (last.includes('체포했습니다')) return 'arrest';
  if (last.includes('동이 텄습니다')) return 'dawn';
  if (last.includes('포위되어')) return 'surrounded';
  return 'arrest';
}

export async function simulateGame({ difficulty, police = 'random', seed = 18881109, gameIndex = 0 }) {
  if (!DIFFICULTIES.includes(difficulty)) throw new Error(`unknown difficulty: ${difficulty}`);
  const policy = typeof police === 'string' ? getPolicePolicy(police) : police;
  const gameSeed = mixSeed(seed >>> 0, gameIndex, difficulty, policy.key);
  const rng = mulberry32(gameSeed);
  const originalRandom = Math.random;
  Math.random = rng;

  try {
    const game = new Game(generateBoard(gameSeed), difficulty);
    let moves = 0;
    policy.beginGame?.(game, rng);
    game.startGame();

    while (game.phase !== 'gameOver') {
      if (game.phase === 'jack') {
        await game.jackTurn();
        moves++;
      } else if (game.phase === 'police') {
        policy.takeTurn(game, rng);
      } else if (game.phase === 'nightEnd') {
        policy.endNight?.(game, rng);
        game.startNight();
      } else {
        throw new Error(`unexpected game phase: ${game.phase}`);
      }
    }
    policy.endGame?.(game, rng);

    return {
      winner: game.winner,
      reason: classifyGame(game),
      night: game.night,
      moves,
    };
  } finally {
    Math.random = originalRandom;
  }
}

export async function runBatch({ difficulty, police = 'random', games = 200, seed = 18881109 }) {
  const started = performance.now();
  const results = [];
  for (let gameIndex = 0; gameIndex < games; gameIndex++) {
    results.push(await simulateGame({ difficulty, police, seed, gameIndex }));
  }
  return summarizeResults({ difficulty, police, seed, results, elapsedMs: performance.now() - started });
}

export function summarizeResults({ difficulty, police, seed, results, elapsedMs = 0 }) {
  const reasons = { arrest: 0, dawn: 0, surrounded: 0, survived: 0 };
  let moves = 0;
  let policeWinNights = 0;
  let policeWins = 0;
  for (const result of results) {
    reasons[result.reason]++;
    moves += result.moves;
    if (result.winner === 'police') {
      policeWins++;
      policeWinNights += result.night;
    }
  }
  const games = results.length;
  return {
    difficulty,
    police: typeof police === 'string' ? police : police.key,
    seed,
    games,
    jackWins: reasons.survived,
    policeWins,
    jackSurvivalRate: games === 0 ? 0 : reasons.survived / games,
    reasons,
    averagePoliceWinNight: policeWins === 0 ? null : policeWinNights / policeWins,
    averageMoves: games === 0 ? 0 : moves / games,
    elapsedMs,
  };
}

function number(value, digits = 1) {
  return value === null ? '-' : value.toFixed(digits);
}

export function formatMarkdownTable(summaries) {
  const lines = [
    '| 난이도 | 경찰 | 판수 | 잭 생존율 | 체포 | 새벽 | 포위 | 생존 | 평균 검거 밤 | 평균 이동 | 시간 |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|',
  ];
  for (const summary of summaries) {
    lines.push(`| ${summary.difficulty} | ${summary.police} | ${summary.games} | ${(summary.jackSurvivalRate * 100).toFixed(1)}% | ${summary.reasons.arrest} | ${summary.reasons.dawn} | ${summary.reasons.surrounded} | ${summary.reasons.survived} | ${number(summary.averagePoliceWinNight, 2)} | ${number(summary.averageMoves, 1)} | ${(summary.elapsedMs / 1000).toFixed(2)}s |`);
  }
  return lines.join('\n');
}
