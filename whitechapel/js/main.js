import { generateBoard } from './board.js';
import { Game, NIGHTS } from './game.js';
import { UI } from './ui.js';

// 보드는 시드 고정 — 실제 보드게임처럼 항상 같은 지도를 사용한다.
const BOARD_SEED = 18881109;

let game = null;
let ui = null;

function startScreen() {
  document.getElementById('start-overlay').classList.remove('hidden');
}

document.getElementById('btn-start').addEventListener('click', () => {
  const diff = document.querySelector('input[name="difficulty"]:checked').value;
  if (diff === 'hard') {
    document.getElementById('start-warn').textContent =
      '어려움(Sonnet) 난이도는 아직 구현되지 않았습니다. 쉬움 또는 보통을 선택해 주세요.';
    return;
  }
  document.getElementById('start-overlay').classList.add('hidden');
  newGame(diff);
});

function newGame(diffKey) {
  const board = generateBoard(BOARD_SEED);
  game = new Game(board, diffKey);
  ui = new UI(game, {
    onEndTurn: endTurn,
    onNewGame: startScreen,
    onStateChanged: checkGameOver,
  });
  game.startGame();
  ui.render();
  const site = game.board.circles[game.jack.path[0]].num;
  ui.showModal(
    `${game.night}번째 밤`,
    `<b>${site}번 지점</b>에서 살인이 일어났습니다.<br>잭은 이곳에서 출발해 은신처로 향합니다.<br>이동 ${15}번 안에 돌아가지 못하면 잭은 검거됩니다.`,
    '추적 시작',
    () => runJackTurn(),
  );
}

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
  if (!game || game.phase !== 'police') return;
  game.endPoliceTurn();
  ui.selectedPatrol = null;
  ui.render();
  runJackTurn();
}

function checkGameOver() {
  if (game.phase === 'gameOver') showGameOver();
}

function showGameOver() {
  ui.render();
  const hideNum = game.board.circles[game.jack.hideout].num;
  if (game.winner === 'police') {
    ui.showModal(
      '검거 성공!',
      `잭을 붙잡았습니다. 은신처는 <b>${hideNum}번 지점</b>이었습니다.<br>지도에 밤별 이동 경로가 공개되었습니다.`,
      '새 게임',
      startScreen,
    );
  } else {
    ui.showModal(
      '잭이 사라졌다...',
      `잭이 ${NIGHTS}번의 밤을 모두 버텨냈습니다.<br>은신처는 <b>${hideNum}번 지점</b>이었습니다.<br>지도에 밤별 이동 경로가 공개되었습니다.`,
      '새 게임',
      startScreen,
    );
  }
}

startScreen();
