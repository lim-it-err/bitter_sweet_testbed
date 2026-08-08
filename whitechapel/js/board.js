// 오리지널 보드 생성기 — 시드 고정 절차 생성.
// 원작 보드 데이터를 복제하지 않고, 교차점(사각형)-도로-지점(원) 구조만 차용한 독자 레이아웃.
//
// 구조:
//  - 교차점(crossing): 격자 위 사각형. 경찰 순찰대가 서는 곳.
//  - 지점(circle): 두 교차점 사이 도로 위의 원. 잭이 이동하는 곳.
//  - 잭은 교차점을 "지나서" 인접 지점으로 이동한다. 그 교차점에 경찰이 있으면 통과 불가(마차 제외).
//  - 블록(face): 격자 한 칸. 같은 블록에 접한 지점끼리는 '골목'으로 순간 이동 가능.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const W = 12; // 교차점 격자 가로
const H = 9; // 교차점 격자 세로
const SP = 92; // 격자 간격(px)
const MARGIN = 64;

function bfsDist(adjList, n, start) {
  const dist = new Array(n).fill(Infinity);
  dist[start] = 0;
  const q = [start];
  for (let qi = 0; qi < q.length; qi++) {
    const u = q[qi];
    for (const v of adjList[u]) {
      if (dist[v] === Infinity) {
        dist[v] = dist[u] + 1;
        q.push(v);
      }
    }
  }
  return dist;
}

function isConnected(nCross, edges) {
  if (edges.length === 0) return false;
  const adj = Array.from({ length: nCross }, () => []);
  for (const [a, b] of edges) {
    adj[a].push(b);
    adj[b].push(a);
  }
  const seen = new Set([edges[0][0]]);
  const q = [edges[0][0]];
  while (q.length) {
    const u = q.pop();
    for (const v of adj[u]) if (!seen.has(v)) { seen.add(v); q.push(v); }
  }
  // 도로가 하나라도 붙은 교차점은 전부 연결되어야 함
  const touched = new Set();
  for (const [a, b] of edges) { touched.add(a); touched.add(b); }
  for (const c of touched) if (!seen.has(c)) return false;
  return true;
}

// 그래프 거리 기반 최원점(farthest-point) 샘플링 — 지점/교차점을 고르게 분산 선택
function spreadSample(distMatrix, candidates, count, firstIndex) {
  const chosen = [candidates[firstIndex % candidates.length]];
  while (chosen.length < count) {
    let best = -1, bestScore = -1;
    for (const c of candidates) {
      if (chosen.includes(c)) continue;
      let minD = Infinity;
      for (const s of chosen) minD = Math.min(minD, distMatrix[s][c]);
      if (minD > bestScore) { bestScore = minD; best = c; }
    }
    chosen.push(best);
  }
  return chosen;
}

export function generateBoard(seed = 18881109) {
  const rnd = mulberry32(seed);
  const cid = (gx, gy) => gy * W + gx;

  const crossings = [];
  for (let gy = 0; gy < H; gy++) {
    for (let gx = 0; gx < W; gx++) {
      crossings.push({
        id: cid(gx, gy),
        gx, gy,
        x: MARGIN + gx * SP + (rnd() - 0.5) * 24,
        y: MARGIN + gy * SP + (rnd() - 0.5) * 24,
      });
    }
  }

  // 후보 도로: 인접 교차점 쌍
  let edges = [];
  for (let gy = 0; gy < H; gy++) {
    for (let gx = 0; gx < W; gx++) {
      if (gx + 1 < W) edges.push([cid(gx, gy), cid(gx + 1, gy)]);
      if (gy + 1 < H) edges.push([cid(gx, gy), cid(gx, gy + 1)]);
    }
  }

  // 일부 도로 제거(불규칙한 골목길 느낌). 연결성과 교차점 최소 차수 2를 유지.
  const removeTarget = Math.floor(edges.length * 0.15);
  const order = edges.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const removed = new Set();
  const degree = new Array(crossings.length).fill(0);
  for (const [a, b] of edges) { degree[a]++; degree[b]++; }
  let removedCount = 0;
  for (const idx of order) {
    if (removedCount >= removeTarget) break;
    const [a, b] = edges[idx];
    if (degree[a] <= 2 || degree[b] <= 2) continue;
    removed.add(idx);
    const kept = edges.filter((_, i) => !removed.has(i));
    if (!isConnected(crossings.length, kept)) {
      removed.delete(idx);
      continue;
    }
    degree[a]--; degree[b]--;
    removedCount++;
  }
  edges = edges.filter((_, i) => !removed.has(i));

  // 지점(원) = 남은 도로의 중간점
  let circles = edges.map(([a, b]) => {
    const ca = crossings[a], cb = crossings[b];
    const dx = cb.x - ca.x, dy = cb.y - ca.y;
    const len = Math.hypot(dx, dy) || 1;
    const off = (rnd() - 0.5) * 10;
    return {
      a, b,
      x: (ca.x + cb.x) / 2 + (-dy / len) * off,
      y: (ca.y + cb.y) / 2 + (dx / len) * off,
    };
  });
  // 번호는 좌상단부터 (읽기 쉬운 배치)
  circles.sort((p, q) => (p.y - q.y) || (p.x - q.x));
  circles.forEach((c, i) => { c.id = i; c.num = i + 1; });

  // 인접 구조
  const circlesAt = Array.from({ length: crossings.length }, () => []);
  for (const c of circles) { circlesAt[c.a].push(c.id); circlesAt[c.b].push(c.id); }

  const crossingAdj = Array.from({ length: crossings.length }, () => []);
  for (const c of circles) { crossingAdj[c.a].push(c.b); crossingAdj[c.b].push(c.a); }

  const circleAdj = circles.map(() => []); // [{to, via}]
  for (let v = 0; v < crossings.length; v++) {
    const inc = circlesAt[v];
    for (let i = 0; i < inc.length; i++) {
      for (let j = i + 1; j < inc.length; j++) {
        circleAdj[inc[i]].push({ to: inc[j], via: v });
        circleAdj[inc[j]].push({ to: inc[i], via: v });
      }
    }
  }

  // 블록(골목): 격자 한 칸을 둘러싼 지점들
  const edgeKey = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);
  const circleByEdge = new Map();
  for (const c of circles) circleByEdge.set(edgeKey(c.a, c.b), c.id);
  const alleyMates = circles.map(() => new Set());
  for (let gy = 0; gy < H - 1; gy++) {
    for (let gx = 0; gx < W - 1; gx++) {
      const corners = [cid(gx, gy), cid(gx + 1, gy), cid(gx, gy + 1), cid(gx + 1, gy + 1)];
      const sides = [
        edgeKey(corners[0], corners[1]),
        edgeKey(corners[2], corners[3]),
        edgeKey(corners[0], corners[2]),
        edgeKey(corners[1], corners[3]),
      ];
      const members = sides.map((k) => circleByEdge.get(k)).filter((x) => x !== undefined);
      for (const m of members) for (const n of members) if (m !== n) alleyMates[m].add(n);
    }
  }

  // 거리 행렬
  const circleAdjPlain = circleAdj.map((lst) => lst.map((e) => e.to));
  const circleDist = circles.map((_, i) => bfsDist(circleAdjPlain, circles.length, i));
  const crossingDist = crossings.map((_, i) => bfsDist(crossingAdj, crossings.length, i));

  // 살인 후보지 10곳(붉은 지점) — 보드 전역에 분산
  const allCircleIds = circles.map((c) => c.id);
  const murderSites = spreadSample(circleDist, allCircleIds, 10, Math.floor(rnd() * circles.length));

  // 경찰 시작 교차점 6곳 — 분산 배치 (맵이 커진 만큼 순찰대도 6명)
  const allCrossIds = crossings.map((c) => c.id);
  const policeStarts = spreadSample(crossingDist, allCrossIds, 6, Math.floor(rnd() * crossings.length));

  return {
    crossings, circles, circlesAt, crossingAdj, circleAdj,
    alleyMates: alleyMates.map((s) => [...s]),
    circleDist, crossingDist, murderSites, policeStarts,
    viewW: MARGIN * 2 + (W - 1) * SP,
    viewH: MARGIN * 2 + (H - 1) * SP,
  };
}
