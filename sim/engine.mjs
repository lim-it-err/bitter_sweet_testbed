import { performance } from 'node:perf_hooks';

import { mulberry32, generateBoard } from '../whitechapel/js/board.js';
import { decideJackMove } from '../whitechapel/js/ai.js';
import { Game, MOVES_PER_NIGHT } from '../whitechapel/js/game.js';
import { mctsJack } from './ai/mcts.mjs';
import { randomPolice } from './police/random.mjs';
import { smartPolice } from './police/smart.mjs';

export const DIFFICULTIES = ['easy', 'medium', 'hard'];

const POLICIES = new Map([
  [randomPolice.key, randomPolice],
  [smartPolice.key, smartPolice],
]);
const JACK_POLICIES = new Map([
  ['heuristic', { key: 'heuristic', chooseMove: decideJackMove }],
  [mctsJack.key, mctsJack],
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
  const end = game.events.findLast?.((event) => event.t === 'end')
    ?? [...game.events].reverse().find((event) => event.t === 'end');
  if (end?.reason === 'trapped') return 'surrounded';
  if (end?.reason === 'survived') return 'survived';
  if (end?.reason === 'dawn') return 'dawn';
  return 'arrest';
}

function applyJackMove(game, move) {
  if (!move) {
    game.winner = 'police';
    game.phase = 'gameOver';
    game.allPaths.push([...game.jack.path]);
    game.events.push({ t: 'end', winner: 'police', reason: 'trapped', night: game.night });
    game.addLog('잭이 순찰대에 포위되어 움직이지 못했습니다. 검거 성공!', 'win');
    return;
  }

  game.events.push({
    t: 'jack', night: game.night, moveNo: game.jack.movesUsed + 1,
    kind: move.type, from: game.jack.pos, mid: move.mid, to: move.to,
  });
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
  game.lastJackDecl = move.type;

  if (game.jack.pos === game.jack.hideout) {
    game.endNight();
  } else if (game.jack.movesUsed >= MOVES_PER_NIGHT) {
    game.winner = 'police';
    game.phase = 'gameOver';
    game.allPaths.push([...game.jack.path]);
    game.events.push({ t: 'end', winner: 'police', reason: 'dawn', night: game.night });
  } else {
    game.phase = 'police';
    for (const patrol of game.patrols) {
      patrol.stepsLeft = 2;
      patrol.acted = false;
    }
  }
}

async function takeJackTurn(game, jack, rng, playouts, timing) {
  const policy = typeof jack === 'string' ? JACK_POLICIES.get(jack) : jack;
  if (!policy) throw new Error(`unknown Jack policy: ${jack}`);
  const started = performance.now();
  const move = await policy.chooseMove(game, { rng, playouts });
  timing.elapsedMs += performance.now() - started;
  timing.decisions++;
  applyJackMove(game, move);
}

export async function simulateGame({
  difficulty,
  police = 'random',
  jack = 'heuristic',
  playouts = 500,
  seed = 18881109,
  gameIndex = 0,
}) {
  if (!DIFFICULTIES.includes(difficulty)) throw new Error(`unknown difficulty: ${difficulty}`);
  const policy = typeof police === 'string' ? getPolicePolicy(police) : police;
  const gameSeed = mixSeed(seed >>> 0, gameIndex, difficulty, policy.key);
  const rng = mulberry32(gameSeed);
  const originalRandom = Math.random;
  Math.random = rng;

  try {
    const game = new Game(generateBoard(gameSeed), difficulty);
    let moves = 0;
    const timing = { elapsedMs: 0, decisions: 0 };
    policy.beginGame?.(game, rng);
    game.startGame();

    while (game.phase !== 'gameOver') {
      if (game.phase === 'jack') {
        await takeJackTurn(game, jack, rng, playouts, timing);
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
      decisionElapsedMs: timing.elapsedMs,
      decisions: timing.decisions,
      decisionMs: timing.decisions === 0 ? 0 : timing.elapsedMs / timing.decisions,
    };
  } finally {
    Math.random = originalRandom;
  }
}

export async function runBatch({
  difficulty,
  police = 'random',
  jack = 'heuristic',
  playouts = 500,
  games = 200,
  seed = 18881109,
}) {
  const started = performance.now();
  const results = [];
  for (let gameIndex = 0; gameIndex < games; gameIndex++) {
    results.push(await simulateGame({ difficulty, police, jack, playouts, seed, gameIndex }));
  }
  return summarizeResults({ difficulty, police, jack, seed, results, elapsedMs: performance.now() - started });
}

export function summarizeResults({ difficulty, police, jack = 'heuristic', seed, results, elapsedMs = 0 }) {
  const reasons = { arrest: 0, dawn: 0, surrounded: 0, survived: 0 };
  let moves = 0;
  let policeWinNights = 0;
  let policeWins = 0;
  let decisionElapsedMs = 0;
  let decisions = 0;
  for (const result of results) {
    reasons[result.reason]++;
    moves += result.moves;
    decisionElapsedMs += result.decisionElapsedMs ?? result.decisionMs ?? 0;
    decisions += result.decisions ?? (result.decisionMs === undefined ? 0 : 1);
    if (result.winner === 'police') {
      policeWins++;
      policeWinNights += result.night;
    }
  }
  const games = results.length;
  return {
    difficulty,
    police: typeof police === 'string' ? police : police.key,
    jack: typeof jack === 'string' ? jack : jack.key,
    seed,
    games,
    jackWins: reasons.survived,
    policeWins,
    jackSurvivalRate: games === 0 ? 0 : reasons.survived / games,
    reasons,
    averagePoliceWinNight: policeWins === 0 ? null : policeWinNights / policeWins,
    averageMoves: games === 0 ? 0 : moves / games,
    averageDecisionMs: decisions === 0 ? 0 : decisionElapsedMs / decisions,
    elapsedMs,
  };
}

function number(value, digits = 1) {
  return value === null ? '-' : value.toFixed(digits);
}

export function formatMarkdownTable(summaries) {
  const lines = [
    '| 난이도 | 경찰 | 잭 | 판수 | 잭 생존율 | 체포 | 새벽 | 포위 | 생존 | 평균 검거 밤 | 평균 이동 | 결정 시간 | 실행 시간 |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|',
  ];
  for (const summary of summaries) {
    lines.push(`| ${summary.difficulty} | ${summary.police} | ${summary.jack} | ${summary.games} | ${(summary.jackSurvivalRate * 100).toFixed(1)}% | ${summary.reasons.arrest} | ${summary.reasons.dawn} | ${summary.reasons.surrounded} | ${summary.reasons.survived} | ${number(summary.averagePoliceWinNight, 2)} | ${number(summary.averageMoves, 1)} | ${number(summary.averageDecisionMs, 2)}ms | ${(summary.elapsedMs / 1000).toFixed(2)}s |`);
  }
  return lines.join('\n');
}
