// SVG 렌더링과 사용자 입력 처리
import { MOVES_PER_NIGHT, NIGHTS } from './game.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const PATROL_COLORS = ['#4ea3ff', '#ffd23f', '#7ee081', '#ff8fd6', '#ffa94d', '#b9e5ff'];
const NIGHT_PATH_COLORS = ['#ff5c5c', '#ffb347', '#7ee081', '#4ea3ff'];

function el(tag, attrs = {}, parent = null) {
  const node = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (parent) parent.appendChild(node);
  return node;
}

export class UI {
  constructor(game, callbacks) {
    this.game = game;
    this.cb = callbacks; // { onEndTurn, onNewGame, onNextNight }
    this.selectedPatrol = null;
    this.mode = 'move'; // move|search|arrest
    this.showBelief = false;
    this.buildBoard();
    this.bindPanel();
    this.render();
  }

  buildBoard() {
    const b = this.game.board;
    const svg = document.getElementById('board');
    svg.innerHTML = '';
    svg.setAttribute('viewBox', `0 0 ${b.viewW} ${b.viewH}`);

    this.gEdges = el('g', {}, svg);
    this.gPaths = el('g', {}, svg); // 게임 종료 시 잭 경로 공개
    this.gBelief = el('g', {}, svg);
    this.gHighlight = el('g', {}, svg);
    this.gCircles = el('g', {}, svg);
    this.gCrossings = el('g', {}, svg);
    this.gMarkers = el('g', {}, svg);
    this.gPatrols = el('g', {}, svg);

    // 도로
    for (const c of b.circles) {
      const ca = b.crossings[c.a], cb = b.crossings[c.b];
      el('path', {
        d: `M${ca.x},${ca.y} Q${c.x},${c.y} ${cb.x},${cb.y}`,
        class: 'street',
      }, this.gEdges);
    }

    // 지점(원)
    this.circleNodes = [];
    const murderSet = new Set(b.murderSites);
    for (const c of b.circles) {
      const g = el('g', { class: 'circle-g', 'data-id': c.id }, this.gCircles);
      el('circle', {
        cx: c.x, cy: c.y, r: 13,
        class: 'circle' + (murderSet.has(c.id) ? ' murder-site' : ''),
      }, g);
      const t = el('text', { x: c.x, y: c.y + 3.5, class: 'circle-num' }, g);
      t.textContent = c.num;
      g.addEventListener('click', () => this.onCircleClick(c.id));
      this.circleNodes.push(g);
    }

    // 교차점(사각형)
    this.crossingNodes = [];
    for (const cr of b.crossings) {
      const r = el('rect', {
        x: cr.x - 6, y: cr.y - 6, width: 12, height: 12,
        class: 'crossing', 'data-id': cr.id,
        transform: `rotate(45 ${cr.x} ${cr.y})`,
      }, this.gCrossings);
      r.addEventListener('click', () => this.onCrossingClick(cr.id));
      this.crossingNodes.push(r);
    }

    // 순찰대 말
    this.patrolNodes = this.game.patrols.map((p) => {
      const g = el('g', { class: 'patrol-g', 'data-id': p.id }, this.gPatrols);
      el('rect', {
        x: -10, y: -10, width: 20, height: 20, rx: 4,
        class: 'patrol', fill: PATROL_COLORS[p.id],
      }, g);
      const t = el('text', { x: 0, y: 4.5, class: 'patrol-num' }, g);
      t.textContent = p.id + 1;
      g.addEventListener('click', (e) => { e.stopPropagation(); this.onPatrolClick(p.id); });
      return g;
    });
  }

  bindPanel() {
    document.querySelectorAll('input[name="mode"]').forEach((r) => {
      r.addEventListener('change', () => { this.mode = r.value; this.render(); });
    });
    document.getElementById('btn-endturn').addEventListener('click', () => this.cb.onEndTurn());
    document.getElementById('btn-newgame').addEventListener('click', () => this.cb.onNewGame());
    document.getElementById('chk-belief').addEventListener('change', (e) => {
      this.showBelief = e.target.checked;
      this.render();
    });
  }

  onPatrolClick(pid) {
    if (this.game.phase !== 'police') return;
    this.selectedPatrol = this.selectedPatrol === pid ? null : pid;
    this.render();
  }

  onCrossingClick(cid) {
    if (this.game.phase !== 'police' || this.selectedPatrol === null || this.mode !== 'move') return;
    if (this.game.movePatrol(this.selectedPatrol, cid)) this.render();
  }

  onCircleClick(circleId) {
    if (this.game.phase !== 'police' || this.selectedPatrol === null) return;
    if (this.mode !== 'search' && this.mode !== 'arrest') return;
    if (this.game.policeAction(this.selectedPatrol, this.mode, circleId)) {
      this.selectedPatrol = null;
      this.cb.onStateChanged();
      this.render();
    }
  }

  render() {
    const g = this.game;
    const b = g.board;

    // 순찰대 위치/선택 표시
    g.patrols.forEach((p, i) => {
      const cr = b.crossings[p.crossing];
      this.patrolNodes[i].setAttribute('transform', `translate(${cr.x},${cr.y})`);
      this.patrolNodes[i].classList.toggle('selected', this.selectedPatrol === i);
      this.patrolNodes[i].classList.toggle('done', g.phase === 'police' && p.stepsLeft === 0 && p.acted);
    });

    // 하이라이트
    this.gHighlight.innerHTML = '';
    this.crossingNodes.forEach((n) => n.classList.remove('reachable'));
    this.circleNodes.forEach((n) => n.classList.remove('actionable', 'murder-current'));
    if (g.phase === 'police' && this.selectedPatrol !== null) {
      const p = g.patrols[this.selectedPatrol];
      if (this.mode === 'move' && p.stepsLeft > 0) {
        for (const cid of g.patrolReachable(p)) this.crossingNodes[cid].classList.add('reachable');
      }
      if ((this.mode === 'search' || this.mode === 'arrest') && !p.acted) {
        for (const c of g.patrolAdjacentCircles(p)) this.circleNodes[c].classList.add('actionable');
      }
    }

    // 이번 밤 살인 지점
    if (g.night > 0 && g.jack.path.length > 0) {
      const site = g.jack.path[0];
      this.circleNodes[site].classList.add('murder-current');
    }

    // 단서 마커
    this.gMarkers.innerHTML = '';
    for (const cid of g.cluesPos) {
      const c = b.circles[cid];
      el('circle', { cx: c.x + 10, cy: c.y - 10, r: 5, class: 'marker-clue' }, this.gMarkers);
    }
    for (const cid of g.cluesNeg) {
      const c = b.circles[cid];
      const m = el('text', { x: c.x + 10, y: c.y - 6, class: 'marker-none' }, this.gMarkers);
      m.textContent = '✕';
    }

    // 추정 위치(근사) 오버레이
    this.gBelief.innerHTML = '';
    if (this.showBelief && g.phase !== 'gameOver' && g.night > 0) {
      for (const cid of g.computeBelief()) {
        const c = b.circles[cid];
        el('circle', { cx: c.x, cy: c.y, r: 17, class: 'belief' }, this.gBelief);
      }
    }

    // 게임 종료: 은신처와 밤별 경로 공개
    this.gPaths.innerHTML = '';
    if (g.phase === 'gameOver') {
      const h = b.circles[g.jack.hideout];
      el('circle', { cx: h.x, cy: h.y, r: 19, class: 'hideout-reveal' }, this.gPaths);
      g.allPaths.forEach((path, ni) => {
        if (path.length < 2) return;
        const pts = path.map((cid) => `${b.circles[cid].x},${b.circles[cid].y}`).join(' ');
        el('polyline', {
          points: pts, class: 'jack-path',
          stroke: NIGHT_PATH_COLORS[ni % NIGHT_PATH_COLORS.length],
        }, this.gPaths);
      });
    }

    this.renderPanel();
  }

  renderPanel() {
    const g = this.game;
    const set = (id, txt) => { document.getElementById(id).textContent = txt; };
    set('info-night', g.night > 0 ? `${g.night} / ${NIGHTS}` : '-');
    set('info-moves', `${g.jack.movesUsed} / ${MOVES_PER_NIGHT}`);
    set('info-coach', g.jack.coaches);
    set('info-alley', g.jack.alleys);
    set('info-diff', g.diff.name);
    set('info-lastmove', g.lastJackDecl === 'coach' ? '마차' : g.lastJackDecl === 'alley' ? '골목' : g.lastJackDecl === 'move' ? '도보' : '-');

    const phaseText = {
      setup: '준비 중',
      jack: '잭이 움직이는 중...',
      police: '경찰 턴 — 순찰대를 지휘하세요',
      nightEnd: '밤이 끝났습니다',
      gameOver: g.winner === 'police' ? '승리! 잭을 검거했습니다' : '패배... 잭이 사라졌습니다',
    };
    set('info-phase', phaseText[g.phase] ?? '');

    document.getElementById('btn-endturn').disabled = g.phase !== 'police';

    const sel = document.getElementById('info-selected');
    if (this.selectedPatrol !== null && g.phase === 'police') {
      const p = g.patrols[this.selectedPatrol];
      sel.textContent = `순찰대 ${p.id + 1} — 이동 ${p.stepsLeft > 0 ? '가능(최대 2칸)' : '완료'} · 행동 ${p.acted ? '완료' : '가능'}`;
    } else {
      sel.textContent = g.phase === 'police' ? '순찰대를 클릭해 선택하세요' : '';
    }

    // 로그
    const logEl = document.getElementById('log');
    logEl.innerHTML = '';
    for (const item of this.game.log.slice(-60)) {
      const d = document.createElement('div');
      d.className = `log-item ${item.cls}`;
      d.textContent = item.msg;
      logEl.appendChild(d);
    }
    logEl.scrollTop = logEl.scrollHeight;
  }

  showModal(title, body, buttonText, onClose) {
    const overlay = document.getElementById('modal');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = body;
    const btn = document.getElementById('modal-btn');
    btn.textContent = buttonText;
    overlay.classList.remove('hidden');
    btn.onclick = () => {
      overlay.classList.add('hidden');
      onClose?.();
    };
  }
}
