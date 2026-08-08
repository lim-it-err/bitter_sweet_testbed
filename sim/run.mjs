#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DIFFICULTIES,
  formatMarkdownTable,
  listPolicePolicies,
  runBatch,
} from './engine.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const args = { games: 200, seed: 18881109, matrix: false, report: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--matrix') args.matrix = true;
    else if (arg === '--report') args.report = true;
    else if (arg === '--diff') args.diff = argv[++i];
    else if (arg === '--police') args.police = argv[++i];
    else if (arg === '--games') args.games = Number(argv[++i]);
    else if (arg === '--seed') args.seed = Number(argv[++i]);
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (!Number.isInteger(args.games) || args.games < 1) throw new Error('--games must be a positive integer');
  if (!Number.isInteger(args.seed)) throw new Error('--seed must be an integer');
  return args;
}

function today() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const difficulties = args.matrix ? DIFFICULTIES : [args.diff ?? 'hard'];
  const policies = args.matrix
    ? (args.police ? [args.police] : listPolicePolicies())
    : [args.police ?? 'random'];

  const summaries = [];
  for (const police of policies) {
    for (const difficulty of difficulties) {
      summaries.push(await runBatch({ difficulty, police, games: args.games, seed: args.seed }));
    }
  }

  const table = formatMarkdownTable(summaries);
  process.stdout.write(`${table}\n`);

  if (args.report) {
    const reportDir = path.join(ROOT, 'docs', 'works', 'reports');
    const reportPath = path.join(reportDir, `balance-${today()}.md`);
    const totalSeconds = summaries.reduce((sum, item) => sum + item.elapsedMs, 0) / 1000;
    const body = [
      `# 화이트채플 밸런스 리포트 — ${today()}`,
      '',
      `- 시드: \`${args.seed}\``,
      `- 조합별 게임 수: ${args.games}`,
      `- 총 실행 시간: ${totalSeconds.toFixed(2)}초`,
      '',
      table,
      '',
    ].join('\n');
    await mkdir(reportDir, { recursive: true });
    await writeFile(reportPath, body, 'utf8');
    process.stdout.write(`\n리포트: ${path.relative(ROOT, reportPath)}\n`);
  }
}

main().catch((error) => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});
