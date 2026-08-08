import { readFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

async function useFastTimers(page) {
  await page.addInitScript(() => {
    const nativeSetTimeout = window.setTimeout.bind(window);
    window.setTimeout = (handler, delay = 0, ...args) => (
      nativeSetTimeout(handler, Math.min(Number(delay) || 0, 5), ...args)
    );
  });
}

async function startGame(page, { spectate = false } = {}) {
  await page.goto('.');
  if (spectate) await page.locator('input[name="pmode"][value="spectate"]').check();
  await page.locator('#btn-start').click();
  await expect(page.locator('#modal')).toBeVisible();
  if (spectate) {
    await page.locator('#btn-speed').evaluate((button) => button.click());
    await expect(page.locator('#btn-speed')).toHaveText('▶ 보통 속도');
  }
  await page.locator('#modal-btn').click();
}

async function finishSpectate(page) {
  await useFastTimers(page);
  await startGame(page, { spectate: true });
  await expect(page.locator('#btn-review-dl')).toBeEnabled({ timeout: 45_000 });
  await expect(page.locator('#btn-review-copy')).toBeEnabled();
  await expect(page.locator('#modal-title')).toHaveText(/검거 성공|잭이 사라졌다/);
}

test('직접 지휘: 시작, 순찰대 이동, 수색, 턴 진행', async ({ page }) => {
  await useFastTimers(page);
  await startGame(page);
  await expect(page.locator('#info-phase')).toContainText('경찰 턴');

  const patrol = page.locator('.patrol-g[data-id="0"]');
  const before = await patrol.getAttribute('transform');
  await patrol.click({ force: true });
  const reachable = page.locator('.crossing.reachable').first();
  await expect(reachable).toBeVisible();
  await reachable.click({ force: true });
  await expect.poll(() => patrol.getAttribute('transform')).not.toBe(before);

  await page.locator('input[name="mode"][value="search"]').check();
  const target = page.locator('.circle-g.actionable').first();
  await expect(target).toBeVisible();
  await target.click({ force: true });
  await expect(page.locator('#log')).toContainText(/수색|단서/);

  const moveCount = await page.locator('#info-moves').textContent();
  await page.locator('#btn-endturn').click();
  await expect.poll(() => page.locator('#info-moves').textContent()).not.toBe(moveCount);
  await expect(page.locator('#info-phase')).toContainText('경찰 턴');
});

test('AI 관전: 빨리감기로 게임 종료까지 자동 진행', async ({ page }) => {
  await finishSpectate(page);
  await expect(page.locator('#info-phase')).toHaveText(/AI 경찰이 잭을 검거했습니다|잭이 사라졌습니다/);
  await expect(page.locator('#info-night')).toHaveText(/[1-4] \/ 4/);
});

test('게임 종료: 리뷰 버튼 활성화와 기보 다운로드', async ({ page }) => {
  await finishSpectate(page);
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#btn-review-dl').click({ force: true });
  const download = await downloadPromise;
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  const review = await readFile(downloadPath, 'utf8');
  expect(review).toContain('# 화이트채플의 그림자 — 게임 리뷰 요청');
  expect(review).toContain('## 타임라인 (기보)');
  expect(review).toContain('## 통계');
  expect(review).toContain('## 보드 그래프 (분석용 데이터)');
});

test('세로 뷰포트: 회전 안내 표시와 닫기', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('.');
  const overlay = page.locator('#rotate-overlay');
  await expect(overlay).toBeVisible();
  await expect(overlay).toContainText('가로 모드로 돌려주세요');
  await page.locator('#btn-rotate-dismiss').click();
  await expect(overlay).toBeHidden();
});
