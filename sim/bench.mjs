#!/usr/bin/env node

import { DIFFICULTIES } from './engine.mjs';
import { benchmarkAll, formatBenchmarkMarkdown } from './benchmark.mjs';

function parseArgs(argv) {
  const args = { games: 3, seed: 18881109, difficulties: DIFFICULTIES };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--games') args.games = Number(argv[++i]);
    else if (arg === '--seed') args.seed = Number(argv[++i]);
    else if (arg === '--diff') args.difficulties = [argv[++i]];
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (!Number.isInteger(args.games) || args.games < 1) throw new Error('--games must be a positive integer');
  if (!Number.isInteger(args.seed)) throw new Error('--seed must be an integer');
  for (const difficulty of args.difficulties) {
    if (!DIFFICULTIES.includes(difficulty)) throw new Error(`unknown difficulty: ${difficulty}`);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const results = await benchmarkAll(args);
  const elapsedMs = results.reduce((sum, result) => sum + result.elapsedMs, 0);
  process.stdout.write([
    '# 화이트채플 AI 성능 벤치마크',
    '',
    `- 시드: \`${args.seed}\``,
    `- 난이도별 게임 수: ${args.games}`,
    `- 총 실행 시간: ${(elapsedMs / 1000).toFixed(2)}초`,
    '',
    formatBenchmarkMarkdown(results),
    '',
  ].join('\n'));
}

main().catch((error) => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});
