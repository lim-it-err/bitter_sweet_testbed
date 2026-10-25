import { generateBoard } from './board.js';
import { Game, NIGHTS } from './game.js';
import { UI } from './ui.js';
import { planPoliceTargets, policeAiMove, policeAiAction } from './police-ai.js';

// 보드는 시드 고정 — 실제 보드게임처럼 항상 같은 지도를 사용한다.
const BOARD_SEED = 18881109;

let game = null;
let ui = null;
let spectateSpeed = 500; // ms, 빨리감기 시 80
let spectateRun = 0; // 새 게임 시작 시 이전 관전 루프 중단용 토큰

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function startScreen() {
  spectateRun++;
  document.getElementById('start-overlay').classList.remove('hidden');
}

// 모바일에서 가로 방향 고정 시도 (지원 브라우저에서만, 실패해도 무시)
async function tryLandscape() {
  try {
    if (screen.orientation?.lock && /Mobi|Android/i.test(navigator.userAgent)) {
      await document.documentElement.requestFullscreen?.();
      await screen.orientation.lock('landscape');
    }
  } catch { /* iOS 등 미지원 — 회전 안내 오버레이가 대신한다 */ }
}

document.getElementById('btn-rotate-dismiss').addEventListener('click', () => {
  document.getElementById('rotate-overlay').classList.add('dismissed');
});

document.getElementById('btn-speed').addEventListener('click', (e) => {
  spectateSpeed = spectateSpeed > 100 ? 80 : 500;
  e.target.textContent = spectateSpeed > 100 ? '⏩ 빨리감기' : '▶ 보통 속도';
});

document.getElementById('btn-start').addEventListener('click', () => {
  const diff = document.querySelector('input[name="difficulty"]:checked').value;
  const pmode = document.querySelector('input[name="pmode"]:checked').value;
  if (diff === 'nightmare' && pmode !== 'jack') {
    document.getElementById('start-warn').textContent =
      '악몽(Sonnet) 난이도는 아직 구현되지 않았습니다. 다른 난이도를 선택해 주세요.';
    return;
  }
  tryLandscape();
  document.getElementById('start-overlay').classList.add('hidden');
  newGame(diff, pmode);
});

function newGame(diffKey, pmode) {
  const spectate = pmode === 'spectate';
  const playAsJack = pmode === 'jack';
  const board = generateBoard(BOARD_SEED);
  game = new Game(board, diffKey);
  game.spectate = spectate;
  game.jackMode = playAsJack ? 'manual' : 'ai';
  // 잭 모드는 난이도에 따라 투입 순찰대 수가 달라지므로 UI 생성 전에 확정한다
  if (playAsJack) game.startGame();
  ui = new UI(game, {
    onEndTurn: endTurn,
    onNewGame: startScreen,
    onStateChanged: checkGameOver,
    onJackStateChanged: afterJackAction,
  });
  if (playAsJack) {
    ui.render();
    ui.showModal(
      '당신이 잭입니다',
      `AI 경찰 ${game.patrols.length}개 순찰대를 4번의 밤 동안 따돌리세요.<br>`
        + '먼저 <b>은신처</b>를 정합니다 — 매일 밤 이곳으로 돌아와야 합니다(이동 15회 제한).<br>'
        + '보라색으로 표시된 지점 중에서 고르세요.',
      '은신처 고르기',
    );
    return;
  }
  const speedBtn = document.getElementById('btn-speed');
  speedBtn.classList.toggle('visible', spectate);
  if (spectate) {
    ui.showBelief = true;
    document.getElementById('chk-belief').checked = true;
  }
  game.startGame();
  ui.render();
  const site = game.board.circles[game.jack.path[0]].num;
  ui.showModal(
    `${game.night}번째 밤`,
    `<b>${site}번 지점</b>에서 살인이 일어났습니다.<br>잭은 이곳에서 출발해 은신처로 향합니다.<br>`
      + (spectate
        ? 'AI 경찰(주황 점선 = 경찰의 추정 범위)이 잭을 추적하는 모습을 관전합니다.'
        : '이동 15번 안에 돌아가지 못하면 잭은 검거됩니다.'),
    spectate ? '관전 시작' : '추적 시작',
    () => (spectate ? runSpectate() : runJackTurn()),
  );
}

// ── 직접 지휘 모드 ─────────────────────────────────────────────
async function runJackTurn() {
  if (!game || game.phase !== 'jack') return;
  try {
    await game.jackTurn();
  } catch (err) {
    ui.showModal('오류', String(err.message ?? err), '확인', startScreen);
    return;
  }
  ui.render();

  if (game.phase === 'nightEnd') {
    ui.showModal(
      `${game.night}번째 밤 종료`,
      `잭이 은신처로 사라졌습니다.<br>단서 마커가 정리되고 다음 밤이 시작됩니다.<br>순찰대 위치는 유지됩니다.`,
      '다음 밤으로',
      () => {
        game.startNight();
        ui.selectedPatrol = null;
        ui.render();
        const site = game.board.circles[game.jack.path[0]].num;
        ui.showModal(
          `${game.night}번째 밤`,
          `<b>${site}번 지점</b>에서 새로운 살인이 일어났습니다.`,
          '추적 시작',
          () => runJackTurn(),
        );
      },
    );
  } else if (game.phase === 'gameOver') {
    showGameOver();
  }
  // phase === 'police' 이면 플레이어 입력 대기
}

function endTurn() {
  if (!game || game.phase !== 'police' || game.spectate) return;
  game.endPoliceTurn();
  ui.selectedPatrol = null;
  ui.render();
  runJackTurn();
}

// ── 잭 플레이 모드: 내 수 이후 AI 경찰이 자동으로 대응 ─────────
async function afterJackAction() {
  if (!game || game.jackMode !== 'manual') return;
  if (game.phase === 'chooseMurder') {
    ui.render();
    return;
  }
  if (game.phase === 'police') {
    await runPoliceAi();
    return;
  }
  if (game.phase === 'nightEnd') {
    ui.showModal(
      `${game.night}번째 밤 종료`,
      '은신처로 무사히 돌아왔습니다. 단서 마커가 정리되고 다음 밤이 시작됩니다.',
      '다음 밤으로',
      () => {
        game.startNight();
        ui.render();
        ui.showModal(`${game.night}번째 밤`, '범행할 붉은 지점을 고르세요.', '확인');
      },
    );
    return;
  }
  if (game.phase === 'gameOver') showGameOver();
}

async function runPoliceAi() {
  const { belief, targets } = planPoliceTargets(game);
  for (const p of game.patrols) {
    if (game.phase !== 'police') break;
    const mv = policeAiMove(game, p, targets);
    if (mv !== null) {
      game.movePatrol(p.id, mv);
      ui.render();
      await sleep(220);
    }
    if (game.phase !== 'police') break;
    const act = policeAiAction(game, p, belief);
    if (act) {
      game.policeAction(p.id, act.kind, act.circle ?? null);
      ui.render();
      await sleep(220);
    }
  }
  if (game.phase === 'police') game.endPoliceTurn();
  ui.render();
  if (game.phase === 'gameOver') showGameOver();
}

// ── AI 관전 모드: 경찰 AI vs 잭 AI ────────────────────────────
async function runSpectate() {
  const token = ++spectateRun;
  const alive = () => game && game.spectate && token === spectateRun;
  while (alive() && game.phase !== 'gameOver') {
    if (game.phase === 'jack') {
      await game.jackTurn();
      ui.render();
      await sleep(spectateSpeed);
    } else if (game.phase === 'police') {
      const { belief, targets } = planPoliceTargets(game);
      for (const p of game.patrols) {
        if (!alive() || game.phase !== 'police') break;
        const mv = policeAiMove(game, p, targets);
        if (mv !== null) {
          game.movePatrol(p.id, mv);
          ui.render();
          await sleep(spectateSpeed / 2);
        }
        if (!alive() || game.phase !== 'police') break;
        const act = policeAiAction(game, p, belief);
        if (act) {
          game.policeAction(p.id, act.kind, act.circle ?? null);
          ui.render();
          await sleep(spectateSpeed / 2);
        }
      }
      if (alive() && game.phase === 'police') game.endPoliceTurn();
    } else if (game.phase === 'nightEnd') {
      game.startNight();
      ui.render();
      await sleep(Math.max(spectateSpeed, 600));
    }
  }
  if (alive() && game.phase === 'gameOver') showGameOver();
}

function checkGameOver() {
  if (game.phase === 'gameOver') showGameOver();
}

function showGameOver() {
  ui.render();
  const hideNum = game.board.circles[game.jack.hideout].num;
  if (game.jackMode === 'manual') {
    if (game.winner === 'police') {
      ui.showModal(
        '붙잡혔다...',
        `AI 경찰에게 검거되었습니다. ${game.night}번째 밤이었습니다.<br>오른쪽 <b>리뷰</b>에서 기보를 내보내 분석을 받아보세요.`,
        '새 게임', startScreen,
      );
    } else {
      ui.showModal(
        '완전 범죄',
        `${NIGHTS}번의 밤을 모두 살아남았습니다. 은신처 ${hideNum}번은 끝내 발각되지 않았습니다.<br>오른쪽 <b>리뷰</b>에서 기보를 내보내 분석을 받아보세요.`,
        '새 게임', startScreen,
      );
    }
    return;
  }
  const who = game.spectate ? 'AI 경찰이' : '당신이';
  if (game.winner === 'police') {
    ui.showModal(
      '검거 성공!',
      `${who} 잭을 붙잡았습니다. 은신처는 <b>${hideNum}번 지점</b>이었습니다.<br>지도에 밤별 이동 경로가 공개되었습니다.<br>오른쪽 <b>리뷰</b>에서 기보를 내보내 AI 분석을 받아보세요.`,
      '새 게임',
      startScreen,
    );
  } else {
    ui.showModal(
      '잭이 사라졌다...',
      `잭이 ${NIGHTS}번의 밤을 모두 버텨냈습니다.<br>은신처는 <b>${hideNum}번 지점</b>이었습니다.<br>지도에 밤별 이동 경로가 공개되었습니다.<br>오른쪽 <b>리뷰</b>에서 기보를 내보내 AI 분석을 받아보세요.`,
      '새 게임',
      startScreen,
    );
  }
}

startScreen();
