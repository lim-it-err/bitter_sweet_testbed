// SVG 렌더링과 사용자 입력 처리
import { MOVES_PER_NIGHT, NIGHTS } from './game.js';
import { buildReview } from './review.js';

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
    this.cb = callbacks; // { onEndTurn, onNewGame, onStateChanged }
    this.selectedPatrol = null;
    this.showBelief = false;
    this._dragged = false;
    this.buildBoard();
    this.initPanZoom();
    this.bindPanel();
    this.render();
  }

  buildBoard() {
    const b = this.game.board;
    const svg = document.getElementById('board');
    svg.innerHTML = '';
    this.svg = svg;
    this.vb = { x: 0, y: 0, w: b.viewW, h: b.viewH };
    this.applyViewBox();

    this.gEdges = el('g', {}, svg);
    this.gPaths = el('g', {}, svg);
    this.gBelief = el('g', {}, svg);
    this.gHighlight = el('g', {}, svg);
    this.gCircles = el('g', {}, svg);
    this.gCrossings = el('g', {}, svg);
    this.gMarkers = el('g', {}, svg);
    this.gPatrols = el('g', {}, svg);

    // 도로 — 간선도로는 굵게
    for (const c of b.circles) {
      const ca = b.crossings[c.a], cb = b.crossings[c.b];
      el('path', {
        d: `M${ca.x},${ca.y} Q${c.x},${c.y} ${cb.x},${cb.y}`,
        class: c.arterial ? 'street arterial' : 'street',
      }, this.gEdges);
    }

    // 지점(원) — 모바일 터치를 위해 투명한 히트 영역 추가
    this.circleNodes = [];
    const murderSet = new Set(b.murderSites);
    for (const c of b.circles) {
      const g = el('g', { class: 'circle-g', 'data-id': c.id }, this.gCircles);
      el('circle', { cx: c.x, cy: c.y, r: 21, class: 'hit-area' }, g);
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
      const g = el('g', { class: 'crossing-g', 'data-id': cr.id }, this.gCrossings);
      el('circle', { cx: cr.x, cy: cr.y, r: 17, class: 'hit-area' }, g);
      el('rect', {
        x: cr.x - 6, y: cr.y - 6, width: 12, height: 12,
        class: cr.arterial ? 'crossing arterial' : 'crossing',
        transform: `rotate(45 ${cr.x} ${cr.y})`,
      }, g);
      g.addEventListener('click', () => this.onCrossingClick(cr.id));
      this.crossingNodes.push(g);
    }

    // 순찰대 말
    this.patrolNodes = this.game.patrols.map((p) => {
      const g = el('g', { class: 'patrol-g', 'data-id': p.id }, this.gPatrols);
      el('circle', { cx: 0, cy: 0, r: 20, class: 'hit-area' }, g);
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

  // ── 팬/줌 (휠 + 핀치 + 드래그) ──────────────────────────────
  applyViewBox() {
    this.svg.setAttribute('viewBox', `${this.vb.x} ${this.vb.y} ${this.vb.w} ${this.vb.h}`);
  }

  svgPoint(clientX, clientY) {
    const pt = this.svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    return pt.matrixTransform(this.svg.getScreenCTM().inverse());
  }

  zoomAt(px, py, factor) {
    const b = this.game.board;
    const newW = Math.min(b.viewW * 1.1, Math.max(b.viewW / 6, this.vb.w * factor));
    const scale = newW / this.vb.w;
    this.vb.x = px - (px - this.vb.x) * scale;
    this.vb.y = py - (py - this.vb.y) * scale;
    this.vb.w = newW;
    this.vb.h = this.vb.h * scale;
    this.applyViewBox();
  }

  initPanZoom() {
    const svg = this.svg;
    const pointers = new Map();
    let pinchDist = 0;
    let panStart = null;

    svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      const p = this.svgPoint(e.clientX, e.clientY);
      this.zoomAt(p.x, p.y, e.deltaY > 0 ? 1.15 : 0.87);
    }, { passive: false });

    svg.addEventListener('pointerdown', (e) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      this._dragged = false;
      if (pointers.size === 1) {
        panStart = { cx: e.clientX, cy: e.clientY, vx: this.vb.x, vy: this.vb.y };
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
        panStart = null;
      }
    });
    svg.addEventListener('pointermove', (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const rect = svg.getBoundingClientRect();
      const unit = this.vb.w / rect.width; // 화면 px → SVG 단위
      if (pointers.size === 1 && panStart) {
        const dx = e.clientX - panStart.cx, dy = e.clientY - panStart.cy;
        if (Math.hypot(dx, dy) > 8) this._dragged = true;
        if (this._dragged) {
          this.vb.x = panStart.vx - dx * unit;
          this.vb.y = panStart.vy - dy * unit;
          this.applyViewBox();
        }
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchDist > 0 && d > 0) {
          this._dragged = true;
          const mid = this.svgPoint((a.x + b.x) / 2, (a.y + b.y) / 2);
          this.zoomAt(mid.x, mid.y, pinchDist / d);
          pinchDist = d;
        }
      }
    });
    const release = (e) => {
      pointers.delete(e.pointerId);
      if (pointers.size === 0) {
        panStart = null;
        // 클릭 이벤트가 처리된 뒤 드래그 플래그 해제
        setTimeout(() => { this._dragged = false; }, 0);
      }
    };
    svg.addEventListener('pointerup', release);
    svg.addEventListener('pointercancel', release);

    document.getElementById('zoom-in').addEventListener('click', () => {
      this.zoomAt(this.vb.x + this.vb.w / 2, this.vb.y + this.vb.h / 2, 0.75);
    });
    document.getElementById('zoom-out').addEventListener('click', () => {
      this.zoomAt(this.vb.x + this.vb.w / 2, this.vb.y + this.vb.h / 2, 1.33);
    });
    document.getElementById('zoom-reset').addEventListener('click', () => {
      const b = this.game.board;
      this.vb = { x: 0, y: 0, w: b.viewW, h: b.viewH };
      this.applyViewBox();
    });
  }

  // ── 입력 ────────────────────────────────────────────────────
  bindPanel() {
    document.getElementById('btn-endturn').addEventListener('click', () => this.cb.onEndTurn());
    document.getElementById('bar-endturn').addEventListener('click', () => this.cb.onEndTurn());
    document.getElementById('btn-newgame').addEventListener('click', () => this.cb.onNewGame());
    document.getElementById('chk-belief').addEventListener('change', (e) => {
      this.showBelief = e.target.checked;
      this.render();
    });
    document.getElementById('bar-search').addEventListener('click', () => {
      if (this.selectedPatrol === null) return;
      if (this.game.policeAction(this.selectedPatrol, 'search')) {
        this.selectedPatrol = null;
        this.cb.onStateChanged();
        this.render();
      }
    });
    document.getElementById('bar-deselect').addEventListener('click', () => {
      this.selectedPatrol = null;
      this.render();
    });
    document.getElementById('btn-review-dl').addEventListener('click', () => {
      const md = buildReview(this.game);
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `whitechapel-review-night${this.game.night}-${this.game.winner === 'police' ? 'win' : 'lose'}.md`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
    document.getElementById('btn-review-copy').addEventListener('click', async (e) => {
      const md = buildReview(this.game);
      try {
        await navigator.clipboard.writeText(md);
        e.target.textContent = '복사됨!';
      } catch {
        e.target.textContent = '복사 실패';
      }
      setTimeout(() => { e.target.textContent = '복사'; }, 1500);
    });
  }

  canCommand() {
    return this.game.phase === 'police' && !this.game.spectate && !this._dragged;
  }

  onPatrolClick(pid) {
    if (!this.canCommand()) return;
    this.selectedPatrol = this.selectedPatrol === pid ? null : pid;
    this.render();
  }

  onCrossingClick(cid) {
    if (!this.canCommand() || this.selectedPatrol === null) return;
    if (this.game.movePatrol(this.selectedPatrol, cid)) this.render();
  }

  // 지점 탭 = 체포 시도 (선택된 순찰대의 인접 지점만 반응)
  onCircleClick(circleId) {
    if (!this.canCommand() || this.selectedPatrol === null) return;
    const p = this.game.patrols[this.selectedPatrol];
    if (p.acted || !this.game.patrolAdjacentCircles(p).includes(circleId)) return;
    if (this.game.policeAction(this.selectedPatrol, 'arrest', circleId)) {
      this.selectedPatrol = null;
      this.cb.onStateChanged();
      this.render();
    }
  }

  // ── 렌더링 ──────────────────────────────────────────────────
  render() {
    const g = this.game;
    const b = g.board;

    g.patrols.forEach((p, i) => {
      const cr = b.crossings[p.crossing];
      this.patrolNodes[i].setAttribute('transform', `translate(${cr.x},${cr.y})`);
      this.patrolNodes[i].classList.toggle('selected', this.selectedPatrol === i);
      this.patrolNodes[i].classList.toggle('done', g.phase === 'police' && p.acted);
    });

    this.crossingNodes.forEach((n) => n.classList.remove('reachable'));
    this.circleNodes.forEach((n) => n.classList.remove('arrestable', 'murder-current'));
    if (g.phase === 'police' && !g.spectate && this.selectedPatrol !== null) {
      const p = g.patrols[this.selectedPatrol];
      if (!p.acted && p.stepsLeft > 0) {
        for (const cid of g.patrolReachable(p)) this.crossingNodes[cid].classList.add('reachable');
      }
      if (!p.acted) {
        for (const c of g.patrolAdjacentCircles(p)) this.circleNodes[c].classList.add('arrestable');
      }
    }

    if (g.night > 0 && g.jack.path.length > 0) {
      this.circleNodes[g.jack.path[0]].classList.add('murder-current');
    }

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

    this.gBelief.innerHTML = '';
    if (this.showBelief && g.phase !== 'gameOver' && g.night > 0) {
      for (const cid of g.computeBelief()) {
        const c = b.circles[cid];
        el('circle', { cx: c.x, cy: c.y, r: 17, class: 'belief' }, this.gBelief);
      }
    }

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

    this.renderActionBar();
    this.renderPanel();
  }

  // 보드 위 플로팅 지휘 바 — 스크롤 없이 이동/수색/체포/턴종료
  renderActionBar() {
    const g = this.game;
    const bar = document.getElementById('action-bar');
    const active = g.phase === 'police' && !g.spectate;
    bar.classList.toggle('hidden', !active);
    if (!active) return;

    const chip = document.getElementById('bar-chip');
    const hint = document.getElementById('bar-hint');
    const searchBtn = document.getElementById('bar-search');
    const deselectBtn = document.getElementById('bar-deselect');
    const endBtn = document.getElementById('bar-endturn');

    if (this.selectedPatrol !== null) {
      const p = g.patrols[this.selectedPatrol];
      chip.textContent = `P${p.id + 1}`;
      chip.style.background = PATROL_COLORS[p.id];
      chip.classList.remove('hidden');
      searchBtn.classList.remove('hidden');
      deselectBtn.classList.remove('hidden');
      endBtn.classList.add('hidden');
      searchBtn.disabled = p.acted;
      hint.textContent = p.acted
        ? '행동 완료 — 다른 순찰대를 탭하세요'
        : (p.stepsLeft > 0
          ? '초록 교차점 탭=이동 · 붉은 지점 탭=체포 · 버튼=주변 수색'
          : '이동 완료 — 붉은 지점 탭=체포 · 버튼=주변 수색');
    } else {
      chip.classList.add('hidden');
      searchBtn.classList.add('hidden');
      deselectBtn.classList.add('hidden');
      endBtn.classList.remove('hidden');
      const remaining = g.patrols.filter((p) => !p.acted).length;
      hint.textContent = remaining > 0
        ? `순찰대를 탭해 지휘하세요 (행동 남음 ${remaining})`
        : '모든 순찰대 행동 완료 — 턴을 종료하세요';
    }
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
      police: g.spectate ? 'AI 경찰이 수사 중...' : '경찰 턴 — 순찰대를 지휘하세요',
      nightEnd: '밤이 끝났습니다',
      gameOver: g.winner === 'police'
        ? (g.spectate ? 'AI 경찰이 잭을 검거했습니다' : '승리! 잭을 검거했습니다')
        : '잭이 사라졌습니다...',
    };
    set('info-phase', phaseText[g.phase] ?? '');

    document.getElementById('btn-endturn').disabled = g.phase !== 'police' || !!g.spectate;
    const reviewReady = g.phase === 'gameOver';
    document.getElementById('btn-review-dl').disabled = !reviewReady;
    document.getElementById('btn-review-copy').disabled = !reviewReady;

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
