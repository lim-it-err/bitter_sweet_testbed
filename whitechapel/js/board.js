// 오리지널 보드 생성기 — 시드 고정 절차 생성.
// 계획도시(동탄식) 스타일: 좌우대칭 격자 + 간선도로.
//
// 구조:
//  - 교차점(crossing): 격자 위 사각형. 경찰 순찰대가 서는 곳.
//  - 지점(circle): 두 교차점 사이 도로 위의 원. 잭이 이동하는 곳.
//  - 잭은 교차점을 "지나서" 인접 지점으로 이동한다. 그 교차점에 경찰이 있으면 통과 불가(마차 제외).
//  - 블록(face): 격자 한 칸. 같은 블록에 접한 지점끼리는 '골목'으로 순간 이동 가능.
//
// 도시 설계:
//  - 세로 간선 3개(좌/중앙/우), 가로 간선 2개 — 간선도로 위 도로는 절대 끊기지 않는다.
//  - 이면도로(비간선)만 일부 제거해 골목길 느낌을 내되, 제거는 좌우대칭으로 수행 → 공정한 밸런스.

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

const W = 13; // 교차점 격자 가로 (홀수 → 완전한 좌우대칭)
const H = 9; // 교차점 격자 세로
const CX = (W - 1) / 2; // 중앙(대칭축) 열
const SP = 90; // 격자 간격(px)
const MARGIN = 64;
const V_ARTERIALS = [2, CX, W - 3]; // 세로 간선도로 열
const H_ARTERIALS = [2, H - 3]; // 가로 간선도로 행

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
  const touched = new Set();
  for (const [a, b] of edges) { touched.add(a); touched.add(b); }
  for (const c of touched) if (!seen.has(c)) return false;
  return true;
}

// 그래프 거리 기반 최원점(farthest-point) 샘플링 — 후보를 고르게 분산 선택
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
  const mirrorC = (id) => {
    const gx = id % W, gy = Math.floor(id / W);
    return cid(W - 1 - gx, gy);
  };

  // 교차점 — 지터는 좌측에서 생성하고 우측에 거울로 복사 (완전 대칭)
  const crossings = new Array(W * H);
  for (let gy = 0; gy < H; gy++) {
    for (let gx = 0; gx <= CX; gx++) {
      const jx = gx === CX ? 0 : (rnd() - 0.5) * 20;
      const jy = (rnd() - 0.5) * 20;
      const id = cid(gx, gy);
      crossings[id] = {
        id, gx, gy,
        x: MARGIN + gx * SP + jx,
        y: MARGIN + gy * SP + jy,
        arterial: V_ARTERIALS.includes(gx) || H_ARTERIALS.includes(gy),
      };
      if (gx !== CX) {
        const mid = cid(W - 1 - gx, gy);
        crossings[mid] = {
          id: mid, gx: W - 1 - gx, gy,
          x: MARGIN + (W - 1 - gx) * SP - jx,
          y: MARGIN + gy * SP + jy,
          arterial: V_ARTERIALS.includes(W - 1 - gx) || H_ARTERIALS.includes(gy),
        };
      }
    }
  }

  // 후보 도로: 인접 교차점 쌍 (+간선 여부)
  const edgeKeyOf = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);
  let edges = [];
  for (let gy = 0; gy < H; gy++) {
    for (let gx = 0; gx < W; gx++) {
      if (gx + 1 < W) {
        edges.push({ a: cid(gx, gy), b: cid(gx + 1, gy), arterial: H_ARTERIALS.includes(gy) });
      }
      if (gy + 1 < H) {
        edges.push({ a: cid(gx, gy), b: cid(gx, gy + 1), arterial: V_ARTERIALS.includes(gx) });
      }
    }
  }
  const edgeIdxByKey = new Map(edges.map((e, i) => [edgeKeyOf(e.a, e.b), i]));
  const mirrorEdgeIdx = (i) => edgeIdxByKey.get(edgeKeyOf(mirrorC(edges[i].a), mirrorC(edges[i].b)));

  // 이면도로 제거 — 좌우 쌍 단위로, 연결성·최소 차수 2 유지
  const nonArterialCount = edges.filter((e) => !e.arterial).length;
  const removeTarget = Math.floor(nonArterialCount * 0.18);
  const canonical = edges
    .map((_, i) => i)
    .filter((i) => !edges[i].arterial && i <= mirrorEdgeIdx(i));
  for (let i = canonical.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [canonical[i], canonical[j]] = [canonical[j], canonical[i]];
  }
  const removed = new Set();
  const degree = new Array(crossings.length).fill(0);
  for (const e of edges) { degree[e.a]++; degree[e.b]++; }
  let removedCount = 0;
  for (const idx of canonical) {
    if (removedCount >= removeTarget) break;
    const pair = [...new Set([idx, mirrorEdgeIdx(idx)])];
    if (pair.some((i) => removed.has(i))) continue;
    const ends = pair.flatMap((i) => [edges[i].a, edges[i].b]);
    const degAfter = new Map();
    for (const v of ends) degAfter.set(v, (degAfter.get(v) ?? degree[v]) - 1);
    if ([...degAfter.values()].some((d) => d < 2)) continue;
    for (const i of pair) removed.add(i);
    const kept = edges.filter((_, i) => !removed.has(i)).map((e) => [e.a, e.b]);
    if (!isConnected(crossings.length, kept)) {
      for (const i of pair) removed.delete(i);
      continue;
    }
    for (const [v, d] of degAfter) degree[v] = d;
    removedCount += pair.length;
  }
  edges = edges.filter((_, i) => !removed.has(i));

  // 지점(원) = 남은 도로의 중간점 — 오프셋도 좌우대칭
  const keptIdxByKey = new Map(edges.map((e, i) => [edgeKeyOf(e.a, e.b), i]));
  const offsets = new Array(edges.length);
  for (let i = 0; i < edges.length; i++) {
    if (offsets[i]) continue;
    const mi = keptIdxByKey.get(edgeKeyOf(mirrorC(edges[i].a), mirrorC(edges[i].b)));
    const ox = mi === i ? 0 : (rnd() - 0.5) * 9;
    const oy = (rnd() - 0.5) * 9;
    offsets[i] = { ox, oy };
    if (mi !== i && mi !== undefined) offsets[mi] = { ox: -ox, oy };
  }
  let circles = edges.map((e, i) => {
    const ca = crossings[e.a], cb = crossings[e.b];
    return {
      a: e.a, b: e.b, arterial: e.arterial,
      x: (ca.x + cb.x) / 2 + offsets[i].ox,
      y: (ca.y + cb.y) / 2 + offsets[i].oy,
    };
  });
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
  const circleByEdge = new Map();
  for (const c of circles) circleByEdge.set(edgeKeyOf(c.a, c.b), c.id);
  const alleyMates = circles.map(() => new Set());
  for (let gy = 0; gy < H - 1; gy++) {
    for (let gx = 0; gx < W - 1; gx++) {
      const corners = [cid(gx, gy), cid(gx + 1, gy), cid(gx, gy + 1), cid(gx + 1, gy + 1)];
      const sides = [
        edgeKeyOf(corners[0], corners[1]),
        edgeKeyOf(corners[2], corners[3]),
        edgeKeyOf(corners[0], corners[2]),
        edgeKeyOf(corners[1], corners[3]),
      ];
      const members = sides.map((k) => circleByEdge.get(k)).filter((x) => x !== undefined);
      for (const m of members) for (const n of members) if (m !== n) alleyMates[m].add(n);
    }
  }

  // 거리 행렬
  const circleAdjPlain = circleAdj.map((lst) => lst.map((e) => e.to));
  const circleDist = circles.map((_, i) => bfsDist(circleAdjPlain, circles.length, i));
  const crossingDist = crossings.map((_, i) => bfsDist(crossingAdj, crossings.length, i));

  // 대칭 유지 도우미: 지점의 거울 지점
  const circleIdByKey = new Map(circles.map((c) => [edgeKeyOf(c.a, c.b), c.id]));
  const mirrorCircle = (id) => {
    const c = circles[id];
    return circleIdByKey.get(edgeKeyOf(mirrorC(c.a), mirrorC(c.b)));
  };

  // 살인 후보지 10곳 — 간선이 아닌 이면도로(뒷골목)에서, 왼쪽 절반 5곳 + 거울 5곳 (좌우대칭 밸런스)
  const leftCircles = circles
    .filter((c) => !c.arterial && (c.a % W) < CX && (c.b % W) < CX)
    .map((c) => c.id);
  const leftSites = spreadSample(circleDist, leftCircles, 5, Math.floor(rnd() * leftCircles.length));
  const murderSites = [...leftSites, ...leftSites.map(mirrorCircle)];

  // 경찰 시작 교차점 5곳 — 파출소처럼 현실적으로: 모서리 간선 교차로 4곳 + 중앙 간선 위 1곳 (좌우대칭)
  const policeStarts = [
    cid(V_ARTERIALS[0], H_ARTERIALS[0]),
    cid(V_ARTERIALS[2], H_ARTERIALS[0]),
    cid(V_ARTERIALS[0], H_ARTERIALS[1]),
    cid(V_ARTERIALS[2], H_ARTERIALS[1]),
    cid(CX, (H - 1) / 2),
  ];

  // 구역(동네) — 간선도로가 나누는 12개 구역에 실제 런던 이스트엔드 지명을 붙인다
  const DISTRICT_NAMES = [
    ['쇼디치', '베스널 그린', '글로브 타운', '보우'],
    ['스피탈필즈', '화이트채플', '스텝니', '마일 엔드'],
    ['올드게이트', '섀드웰', '와핑', '라임하우스'],
  ];
  // 도시 블록(시각용) — 격자 한 칸의 안쪽 사각형
  const blocks = [];
  for (let gy = 0; gy < H - 1; gy++) {
    for (let gx = 0; gx < W - 1; gx++) {
      const corners = [cid(gx, gy), cid(gx + 1, gy), cid(gx, gy + 1), cid(gx + 1, gy + 1)]
        .map((id) => crossings[id]);
      const inset = 15;
      const x0 = Math.max(corners[0].x, corners[2].x) + inset;
      const x1 = Math.min(corners[1].x, corners[3].x) - inset;
      const y0 = Math.max(corners[0].y, corners[1].y) + inset;
      const y1 = Math.min(corners[2].y, corners[3].y) - inset;
      if (x1 > x0 && y1 > y0) {
        blocks.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 });
      }
    }
  }

  // 구역 라벨은 도로/지점과 겹치지 않도록 블록(건물 덩어리) 중앙에 놓는다
  const xBounds = [0, ...V_ARTERIALS, W - 1];
  const yBounds = [0, ...H_ARTERIALS, H - 1];
  const districts = [];
  for (let yi = 0; yi < yBounds.length - 1; yi++) {
    for (let xi = 0; xi < xBounds.length - 1; xi++) {
      const cx = MARGIN + ((xBounds[xi] + xBounds[xi + 1]) / 2) * SP;
      const cy = MARGIN + ((yBounds[yi] + yBounds[yi + 1]) / 2) * SP;
      let best = null, bestD = Infinity;
      for (const blk of blocks) {
        if (blk.w < 40) continue; // 이름이 들어갈 만큼 넓은 블록만
        const d = Math.hypot(blk.cx - cx, blk.cy - cy);
        if (d < bestD) { bestD = d; best = blk; }
      }
      districts.push({ name: DISTRICT_NAMES[yi][xi], x: best?.cx ?? cx, y: best?.cy ?? cy });
    }
  }

  return {
    crossings, circles, circlesAt, crossingAdj, circleAdj,
    alleyMates: alleyMates.map((s) => [...s]),
    circleDist, crossingDist, murderSites, policeStarts,
    districts, blocks,
    viewW: MARGIN * 2 + (W - 1) * SP,
    viewH: MARGIN * 2 + (H - 1) * SP,
  };
}
