#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { formatMarkdownTable, runBatch } from './engine.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const args = { games: 300, playouts: 500, seed: 18881109, difficulty: 'hard', report: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--report') args.report = true;
    else if (arg === '--games') args.games = Number(argv[++i]);
    else if (arg === '--playouts') args.playouts = Number(argv[++i]);
    else if (arg === '--seed') args.seed = Number(argv[++i]);
    else if (arg === '--diff') args.difficulty = argv[++i];
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (!Number.isInteger(args.games) || args.games < 1) throw new Error('--games must be a positive integer');
  if (!Number.isInteger(args.playouts) || args.playouts < 1) throw new Error('--playouts must be a positive integer');
  if (!Number.isInteger(args.seed)) throw new Error('--seed must be an integer');
  return args;
}

function today() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

function twoProportionZ(left, right) {
  const leftWins = left.jackWins;
  const rightWins = right.jackWins;
  const pooled = (leftWins + rightWins) / (left.games + right.games);
  const standardError = Math.sqrt(pooled * (1 - pooled) * (1 / left.games + 1 / right.games));
  return standardError === 0 ? 0 : (right.jackSurvivalRate - left.jackSurvivalRate) / standardError;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const common = {
    difficulty: args.difficulty,
    police: 'smart',
    games: args.games,
    seed: args.seed,
  };
  const heuristic = await runBatch({ ...common, jack: 'heuristic' });
  const mcts = await runBatch({ ...common, jack: 'mcts', playouts: args.playouts });
  const zScore = twoProportionZ(heuristic, mcts);
  const stronger = mcts.jackSurvivalRate > heuristic.jackSurvivalRate && zScore >= 1.96;
  const fastEnough = mcts.averageDecisionMs < 300;
  const promoted = stronger && fastEnough;
  const table = formatMarkdownTable([heuristic, mcts]);
  const verdict = promoted
    ? 'MCTS가 유의미하게 강하고 300ms 기준을 충족해 브라우저 승격 대상이다.'
    : `승격하지 않는다: ${stronger ? '' : '유의미한 성능 향상이 없고 '}${fastEnough ? '' : '평균 결정 시간이 300ms 이상이고 '}현재 기준을 충족하지 못했다.`;
  const body = [
    `# MCTS 잭 비교 리포트 — ${today()}`,
    '',
    `- 난이도: \`${args.difficulty}\``,
    '- 경찰 정책: `smart`',
    `- 정책별 게임 수: ${args.games}`,
    `- 공통 시드: \`${args.seed}\``,
    `- MCTS 예산: 이동당 ${args.playouts} 플레이아웃`,
    '- 보상: 밤 생존 +1, 검거/새벽/포위 -1 (중간 shaping 없음)',
    '',
    table,
    '',
    '## 판정',
    '',
    `- 생존율 차이: ${((mcts.jackSurvivalRate - heuristic.jackSurvivalRate) * 100).toFixed(1)}%p`,
    `- 두 비율 z-score: ${zScore.toFixed(2)} (보수적 승격 기준: 1.96 이상)`,
    `- MCTS 이동당 평균 계산 시간: ${mcts.averageDecisionMs.toFixed(2)}ms (기준: 300ms 미만)`,
    `- 결론: ${verdict}`,
    '',
  ].join('\n');

  process.stdout.write(`${body}\n`);
  if (args.report) {
    const reportDir = path.join(ROOT, 'docs', 'works', 'reports');
    const reportPath = path.join(reportDir, `mcts-${today()}.md`);
    await mkdir(reportDir, { recursive: true });
    await writeFile(reportPath, body, 'utf8');
    process.stdout.write(`리포트: ${path.relative(ROOT, reportPath)}\n`);
  }
}

main().catch((error) => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});
