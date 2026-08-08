// 게임 규칙 엔진 — 플레이어는 경찰(순찰대 5), AI는 잭.
//
// 한 밤(night)의 구조:
//   1) 잭이 살인 후보지 중 한 곳에서 살인 (위치 공개)
//   2) 잭 이동(비공개, 이동 종류만 공개) → 경찰 턴(순찰대별 최대 2칸 이동 + 수색/체포 1회) 반복
//   3) 잭이 은신처에 도착하면 밤 종료. 15번째 이동까지 못 돌아가면 새벽에 검거(경찰 승)
//   4) 4번의 밤을 모두 버티면 잭 승리
//
// 잭의 특수 이동(선언은 공개, 목적지는 비공개):
//   - 마차(총 3회): 한 턴에 지점 2칸 이동, 경찰이 선 교차점도 통과 가능
//   - 골목(총 2회): 같은 블록에 접한 다른 지점으로 순간 이동

import { decideJackMove, chooseHideout, chooseMurderSite } from './ai.js';

export const MOVES_PER_NIGHT = 15;
export const NIGHTS = 4;

export const DIFFICULTY = {
  easy: { key: 'easy', name: '쉬움', maxDepth: 1, noise: 25, sonnet: false },
  medium: { key: 'medium', name: '보통', maxDepth: 3, noise: 6, sonnet: false },
  hard: { key: 'hard', name: '어려움 (Sonnet)', maxDepth: 0, noise: 0, sonnet: true },
};

export class Game {
  constructor(board, difficultyKey) {
    this.board = board;
    this.diff = DIFFICULTY[difficultyKey];
    this.patrols = board.policeStarts.map((c, i) => ({
      id: i, crossing: c, stepsLeft: 0, acted: true,
    }));
    this.night = 0;
    this.jack = { hideout: null, pos: null, path: [], movesUsed: 0, coaches: 3, alleys: 2 };
    this.usedMurderSites = [];
    this.cluesPos = new Set(); // 이번 밤: 단서 발견된 지점
    this.cluesNeg = new Set(); // 이번 밤: 수색했지만 흔적 없던 지점
    this.negHistory = []; // {circle, atMove} — 추정 위치 계산용
    this.arrestFails = []; // {circle, atMove}
    this.declared = []; // 이번 밤 잭 이동 종류 목록: 'move'|'coach'|'alley'
    this.allPaths = []; // 밤별 잭 이동 경로(게임 종료 시 공개)
    this.log = [];
    this.phase = 'setup'; // setup|jack|police|nightEnd|gameOver
    this.winner = null; // 'police'|'jack'
    this.lastJackDecl = null;
  }

  addLog(msg, cls = '') {
    this.log.push({ msg, cls, night: this.night });
  }

  startGame() {
    this.jack.hideout = chooseHideout(this);
    this.addLog('잭이 은신처를 정했습니다. 위치는 게임이 끝날 때까지 비밀입니다.', 'jack');
    this.startNight();
  }

  startNight() {
    this.night++;
    const site = chooseMurderSite(this);
    this.usedMurderSites.push(site);
    this.jack.pos = site;
    this.jack.path = [site];
    this.jack.movesUsed = 0;
    this.declared = [];
    this.cluesPos.clear();
    this.cluesNeg.clear();
    this.negHistory = [];
    this.arrestFails = [];
    this.phase = 'jack';
    this.addLog(`${this.night}번째 밤 — ${this.board.circles[site].num}번 지점에서 살인이 일어났습니다!`, 'murder');
  }

  // 잭의 합법 이동 후보 (AI에서도 사용)
  legalJackMoves(pos = this.jack.pos, coaches = this.jack.coaches, alleys = this.jack.alleys, patrols = this.patrols) {
    const occupied = new Set(patrols.map((p) => p.crossing));
    const out = [];
    for (const { to, via } of this.board.circleAdj[pos]) {
      if (!occupied.has(via)) out.push({ type: 'move', to, mid: null });
    }
    if (coaches > 0) {
      const seen = new Set();
      for (const { to: m } of this.board.circleAdj[pos]) {
        for (const { to } of this.board.circleAdj[m]) {
          if (to === pos || seen.has(to)) continue;
          seen.add(to);
          out.push({ type: 'coach', to, mid: m });
        }
      }
    }
    if (alleys > 0) {
      for (const to of this.board.alleyMates[pos]) {
        out.push({ type: 'alley', to, mid: null });
      }
    }
    return out;
  }

  async jackTurn() {
    const move = await decideJackMove(this);
    if (!move) {
      this.winner = 'police';
      this.phase = 'gameOver';
      this.allPaths.push([...this.jack.path]);
      this.addLog('잭이 순찰대에 포위되어 움직이지 못했습니다. 검거 성공!', 'win');
      return;
    }
    if (move.type === 'coach') {
      this.jack.coaches--;
      this.jack.path.push(move.mid, move.to);
      this.addLog(`잭이 마차를 탔습니다. (이동 ${this.jack.movesUsed + 1}/${MOVES_PER_NIGHT}, 남은 마차 ${this.jack.coaches})`, 'jack');
    } else if (move.type === 'alley') {
      this.jack.alleys--;
      this.jack.path.push(move.to);
      this.addLog(`잭이 골목으로 사라졌습니다. (이동 ${this.jack.movesUsed + 1}/${MOVES_PER_NIGHT}, 남은 골목 ${this.jack.alleys})`, 'jack');
    } else {
      this.jack.path.push(move.to);
      this.addLog(`잭이 이동했습니다. (이동 ${this.jack.movesUsed + 1}/${MOVES_PER_NIGHT})`, 'jack');
    }
    this.jack.pos = move.to;
    this.jack.movesUsed++;
    this.declared.push(move.type);
    this.lastJackDecl = move.type;

    if (this.jack.pos === this.jack.hideout) {
      this.endNight();
      return;
    }
    if (this.jack.movesUsed >= MOVES_PER_NIGHT) {
      this.winner = 'police';
      this.phase = 'gameOver';
      this.allPaths.push([...this.jack.path]);
      this.addLog('동이 텄습니다. 은신처로 돌아가지 못한 잭이 검거되었습니다!', 'win');
      return;
    }
    this.phase = 'police';
    for (const p of this.patrols) { p.stepsLeft = 2; p.acted = false; }
  }

  endNight() {
    this.allPaths.push([...this.jack.path]);
    if (this.night >= NIGHTS) {
      this.winner = 'jack';
      this.phase = 'gameOver';
      this.addLog('잭이 마지막 밤에도 은신처로 사라졌습니다. 잭의 승리...', 'lose');
    } else {
      this.phase = 'nightEnd';
      this.addLog(`잭이 은신처에 도착했습니다. ${this.night}번째 밤이 끝났습니다.`, 'night');
    }
  }

  // 순찰대 이동: stepsLeft 이내로 도달 가능한 교차점 집합
  patrolReachable(patrol) {
    const occupied = new Set(this.patrols.filter((p) => p.id !== patrol.id).map((p) => p.crossing));
    const dist = new Map([[patrol.crossing, 0]]);
    const q = [patrol.crossing];
    const out = new Set();
    for (let qi = 0; qi < q.length; qi++) {
      const u = q[qi];
      const d = dist.get(u);
      if (d >= patrol.stepsLeft) continue;
      for (const v of this.board.crossingAdj[u]) {
        if (!dist.has(v)) {
          dist.set(v, d + 1);
          q.push(v);
          if (!occupied.has(v)) out.add(v);
        }
      }
    }
    return out;
  }

  movePatrol(patrolId, targetCrossing) {
    const p = this.patrols[patrolId];
    if (this.phase !== 'police' || !this.patrolReachable(p).has(targetCrossing)) return false;
    p.crossing = targetCrossing;
    p.stepsLeft = 0;
    return true;
  }

  patrolAdjacentCircles(patrol) {
    return this.board.circlesAt[patrol.crossing];
  }

  policeAction(patrolId, kind, circleId) {
    const p = this.patrols[patrolId];
    if (this.phase !== 'police' || p.acted) return false;
    if (!this.patrolAdjacentCircles(p).includes(circleId)) return false;
    p.acted = true;
    const num = this.board.circles[circleId].num;
    if (kind === 'search') {
      if (this.jack.path.includes(circleId)) {
        this.cluesPos.add(circleId);
        this.addLog(`순찰대 ${p.id + 1}이(가) ${num}번 지점에서 단서를 발견했습니다!`, 'clue');
      } else {
        this.cluesNeg.add(circleId);
        this.negHistory.push({ circle: circleId, atMove: this.jack.movesUsed });
        this.addLog(`순찰대 ${p.id + 1}이(가) ${num}번 지점을 수색했지만 흔적이 없습니다.`, '');
      }
    } else if (kind === 'arrest') {
      if (this.jack.pos === circleId) {
        this.winner = 'police';
        this.phase = 'gameOver';
        this.allPaths.push([...this.jack.path]);
        this.addLog(`순찰대 ${p.id + 1}이(가) ${num}번 지점에서 잭을 체포했습니다! 승리!`, 'win');
      } else {
        this.arrestFails.push({ circle: circleId, atMove: this.jack.movesUsed });
        this.addLog(`순찰대 ${p.id + 1}이(가) ${num}번 지점을 덮쳤지만 아무도 없습니다.`, '');
      }
    }
    return true;
  }

  endPoliceTurn() {
    if (this.phase !== 'police') return;
    this.phase = 'jack';
  }

  // 잭의 가능한 현재 위치(근사) — 이번 밤의 공개 정보만으로 계산.
  // 선언된 이동 종류, 실패한 체포, 흔적 없던 수색을 반영. 경찰의 통행 차단은 무시(상위집합).
  computeBelief() {
    if (this.night === 0 || this.jack.path.length === 0) return new Set();
    let layer = new Set([this.jack.path[0]]);
    for (let t = 1; t <= this.jack.movesUsed; t++) {
      const decl = this.declared[t - 1];
      const next = new Set();
      for (const pos of layer) {
        if (decl === 'move') {
          for (const { to } of this.board.circleAdj[pos]) next.add(to);
        } else if (decl === 'coach') {
          for (const { to: m } of this.board.circleAdj[pos]) {
            for (const { to } of this.board.circleAdj[m]) if (to !== pos) next.add(to);
          }
        } else if (decl === 'alley') {
          for (const to of this.board.alleyMates[pos]) next.add(to);
        }
      }
      for (const { circle, atMove } of this.negHistory) {
        if (atMove >= t) next.delete(circle);
      }
      for (const { circle, atMove } of this.arrestFails) {
        if (atMove === t) next.delete(circle);
      }
      layer = next;
    }
    return layer;
  }
}
