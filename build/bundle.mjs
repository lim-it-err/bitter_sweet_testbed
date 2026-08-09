import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GAME = path.join(ROOT, 'whitechapel');

// 함수 선언 호이스팅으로 game↔ai 순환 참조를 해소한다. 나머지는 사용처보다 정의가 먼저
// 평가되도록 현재 브라우저 모듈 그래프의 위상 순서로 배치한다.
const MODULES = [
  'board.js',
  'game.js',
  'ai.js',
  'police-ai.js',
  'review.js',
  'ui.js',
  'main.js',
];

function stripModuleSyntax(source, file) {
  const withoutImports = source.replace(/^\s*import\s+[\s\S]*?;\s*$/gm, '');
  const withoutDeclarations = withoutImports.replace(
    /^export\s+(?=(?:async\s+)?function\b|class\b|const\b|let\b|var\b)/gm,
    '',
  );
  const bundled = withoutDeclarations.replace(/^\s*export\s*\{[^}]*\};?\s*$/gm, '');
  if (/^\s*(?:import|export)\b/m.test(bundled)) {
    throw new Error(`${file}: unsupported module syntax remains`);
  }
  return bundled.trim();
}

function replaceExactlyOnce(source, pattern, replacement, label) {
  const matches = source.match(pattern);
  if (!matches || matches.length !== 1) {
    throw new Error(`${label}: expected exactly one match, got ${matches?.length ?? 0}`);
  }
  return source.replace(pattern, replacement);
}

async function main() {
  const [template, css, ...modules] = await Promise.all([
    readFile(path.join(GAME, 'index.html'), 'utf8'),
    readFile(path.join(GAME, 'style.css'), 'utf8'),
    ...MODULES.map((file) => readFile(path.join(GAME, 'js', file), 'utf8')),
  ]);

  const js = modules
    .map((source, index) => `// ── ${MODULES[index]} ──\n${stripModuleSyntax(source, MODULES[index])}`)
    .join('\n\n')
    .replace(/<\/script/gi, '<\\/script');

  // 실행하지 않고 파싱만 해 결합 과정의 중복 선언/구문 오류를 빌드 시 잡는다.
  new vm.Script(js, { filename: 'whitechapel-standalone.js' });

  let html = replaceExactlyOnce(
    template,
    /<link rel="stylesheet" href="style\.css" \/>/g,
    `<style>\n${css.trim()}\n  </style>`,
    'stylesheet link',
  );
  html = replaceExactlyOnce(
    html,
    /<script type="module" src="js\/main\.js"><\/script>/g,
    `<script>\n${js}\n  </script>`,
    'module script',
  );

  const output = path.join(GAME, 'standalone.html');
  await writeFile(output, html, 'utf8');
  process.stdout.write(`생성: ${path.relative(ROOT, output)} (${Buffer.byteLength(html)} bytes)\n`);
}

main().catch((error) => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});
