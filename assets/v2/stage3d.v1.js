/* NEKI 랜딩 3D 무대 (three.js r170)
   화면에 고정된 캔버스 하나가 섹션 배경 위, 글 아래에 깔린다. 규칙은 DESIGN.md 8-1.
   - 좌표: z=0 평면에서 3D 1단위 = CSS 1px. 물체는 DOM 앵커([data-stage])를 매 프레임 따라간다.
   - ① hero: 폰 둘레에 떠다니는 네컷, 마우스로 카메라가 돈다, 'neki:shutter'마다 한 장이 튀어나온다
   - ② map: 비스듬히 누운 지도 위로 스크롤하면 다가가고, 역 근처에서 핀이 솟는다
   - ④ archive: 떠돌던 네컷들이 스크롤에 따라 폰 안으로 빨려 들어간다
   - ⑤ 페이지: 깊이가 다른 카드가 스크롤을 따라 흐른다
   - 끄는 경우: 모션 최소화(전부), 데이터 절약·2g/3g·메모리 4GB 미만·WebGL 없음(3D만) → DOM 장식이 그대로 보인다
   - 텍스처는 canvas로 그린다. 실제 네컷 사진이 생기면 makeStrip()/makePolaroid()만 이미지로 바꾸면 된다. */

const root = document.documentElement;
const canvas = document.querySelector('.stage3d');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const conn = navigator.connection;
const weak = (conn && (conn.saveData || /(^|-)2g$|^3g$/.test(conn.effectiveType || ''))) ||
  (navigator.deviceMemory && navigator.deviceMemory < 4);

if (canvas && !reduce && !weak) {
  const kick = () => (window.requestIdleCallback || ((f) => setTimeout(f, 300)))(() => init().catch(off), { timeout: 1500 });
  if (document.readyState === 'complete') kick(); else addEventListener('load', kick, { once: true });
}

function off() { root.classList.remove('has-stage'); }

async function init() {
  const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js');
  const narrow = () => innerWidth < 768;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  canvas.addEventListener('webglcontextlost', off);

  const scene = new THREE.Scene();
  const FOV = 30;
  const camera = new THREE.PerspectiveCamera(FOV, 1, 10, 6000);
  let vw = 0, vh = 0, camZ = 0;
  function resize() {
    vw = innerWidth; vh = innerHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio, narrow() ? 1.5 : 2));
    renderer.setSize(vw, vh, false);
    camera.aspect = vw / vh;
    camZ = (vh / 2) / Math.tan(THREE.MathUtils.degToRad(FOV / 2)); // z=0에서 1단위 = 1px
    camera.position.set(0, 0, camZ);
    camera.updateProjectionMatrix();
  }
  resize();
  addEventListener('resize', resize);

  // DOM 앵커 중심 → 3D 좌표
  const anchor = (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2 - vw / 2, y: vh / 2 - (r.top + r.height / 2), w: r.width, h: r.height, top: r.top, bottom: r.bottom };
  };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  // ---------- 텍스처 (canvas) ----------
  const PALETTES = [
    ['#FFC7C2', '#FFECEB'], ['#FFE3B8', '#FFF4E0'], ['#D8E6FF', '#F0F5FF'],
    ['#FFD3E2', '#FFF0F5'], ['#D7F0E3', '#F1FAF5'], ['#FF786B', '#FFDAD6']
  ];
  const SH = 18; // 그림자 여백(px)
  function paper(w, h) {
    const c = document.createElement('canvas');
    const s = 2; c.width = (w + SH * 2) * s; c.height = (h + SH * 2) * s;
    const g = c.getContext('2d'); g.scale(s, s);
    g.shadowColor = 'rgba(32,34,39,.22)'; g.shadowBlur = 14; g.shadowOffsetY = 6;
    g.fillStyle = '#fff'; g.fillRect(SH, SH, w, h);
    g.shadowColor = 'transparent';
    return { c, g };
  }
  // 실제 네컷 사진(앱 스토어 화면에서 잘라낸 것). 못 불러오면 실루엣으로 그린다.
  const PHOTO_SRC = ['ai-1','ai-2','ai-3','ai-4','ai-5','ai-6','ai-7','ai-8'];
  const photos = (await Promise.all(PHOTO_SRC.map((n) => new Promise((ok) => {
    const im = new Image(); im.src = `img/photos/${n}.webp`;
    im.decode().then(() => ok(im), () => ok(null));
  })))).filter(Boolean);
  function people(g, x, y, w, h, pal, k) {
    const im = photos.length ? photos[k % photos.length] : null;
    if (im) { // cover로 채운다
      const r = Math.max(w / im.width, h / im.height), sw = w / r, sh = h / r;
      g.drawImage(im, (im.width - sw) / 2, (im.height - sh) / 2.6, sw, sh, x, y, w, h);
      return;
    }
    const gr = g.createLinearGradient(x, y, x + w, y + h);
    gr.addColorStop(0, pal[0]); gr.addColorStop(1, pal[1]);
    g.fillStyle = gr; g.fillRect(x, y, w, h);
    g.fillStyle = 'rgba(32,34,39,.16)';
    [[.36, .45], [.64, .42]].forEach(([hx, hy], i) => {
      const dx = Math.sin(k * 1.7 + i) * w * .06, dy = Math.cos(k * 2.3 + i) * h * .05;
      const cx = x + w * hx + dx, cy = y + h * hy + dy, r = Math.min(w, h) * .14;
      g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(cx, y + h * .98, r * 1.7, h * .32, 0, Math.PI, 0); g.fill();
    });
  }
  function texture(c) {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return t;
  }
  function makeStrip(n) {
    const w = 96, cell = 100, gap = 5, pad = 7, foot = 22, h = pad + (cell + gap) * 4 - gap + foot;
    const { c, g } = paper(w, h);
    const pal = PALETTES[n % PALETTES.length];
    for (let i = 0; i < 4; i++) people(g, SH + pad, SH + pad + i * (cell + gap), w - pad * 2, cell, pal, n % 2 ? i : n + i * 2);
    g.fillStyle = '#FF5647'; g.font = '800 11px Pretendard, sans-serif'; g.fillText('NEKI', SH + pad, SH + h - 7);
    return { tex: texture(c), w: w + SH * 2, h: h + SH * 2 };
  }
  function makePolaroid(n) {
    const w = 130, pad = 9, ph = 112, h = pad + ph + 32;
    const { c, g } = paper(w, h);
    people(g, SH + pad, SH + pad, w - pad * 2, ph, PALETTES[(n + 2) % PALETTES.length], n);
    g.fillStyle = 'rgba(255,120,107,.65)'; // 마스킹 테이프
    g.save(); g.translate(SH + w / 2, SH + 2); g.rotate(-0.08); g.fillRect(-28, -8, 56, 16); g.restore();
    return { tex: texture(c), w: w + SH * 2, h: h + SH * 2 };
  }
  const card = (n, kind) => {
    const t = (kind ?? n % 3) === 0 ? makePolaroid(n) : makeStrip(n);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(t.w, t.h), new THREE.MeshBasicMaterial({ map: t.tex, transparent: true, depthWrite: false }));
    return m;
  };

  // ---------- ① 히어로 ----------
  const heroEl = document.querySelector('[data-stage="hero"]');
  const hero = new THREE.Group(); scene.add(hero);
  const heroCards = [];
  const HERO_N = narrow() ? 7 : 10;
  for (let i = 0; i < HERO_N; i++) {
    const m = card(i);
    const a = (i / HERO_N) * Math.PI * 2 + rand() * .5;
    const rad = 0.8 + rand() * 0.45; // 앵커 크기 대비
    const ax = Math.cos(a) * rad;
    m.userData = {
      // 왼쪽(글 쪽)으로는 덜 퍼지게: 헤드라인 뒤를 가리지 않는다
      ax: ax < 0 ? ax * .55 : ax * .95, ay: Math.sin(a) * rad * 0.85, z: -520 + rand() * 480,
      rz: (rand() - .5) * .6, ry: (rand() - .5) * .7, s: .5 + rand() * .35, ph: rand() * 6, bump: 0
    };
    hero.add(m); heroCards.push(m);
  }
  // 찰칵: 카드들이 움찔하고, 폰에서 새 네컷이 튀어나와 날아간다
  const pops = [];
  let popN = 100;
  addEventListener('neki:shutter', () => {
    heroCards.forEach((m) => { m.userData.bump = 1; });
    const m = card(popN++, 1);
    m.userData = { t0: performance.now(), dir: rand() < .5 ? -1 : 1, vy: .3 + rand() * .4, rz: (rand() - .5) * 1.2 };
    hero.add(m); pops.push(m);
  });

  // ---------- ② 지도 ----------
  const mapEl = document.querySelector('[data-stage="map"]');
  const map = new THREE.Group(); scene.add(map);
  const mapSec = mapEl.closest('section');
  const MAP = 1400, STATION = { x: 120, y: -60 };
  {
    const c = document.createElement('canvas'); c.width = c.height = 1400;
    const g = c.getContext('2d');
    g.fillStyle = '#F2F3F5'; g.fillRect(0, 0, 1400, 1400);
    // 블록
    g.fillStyle = '#E6E8EC';
    for (let y = 20; y < 1400; y += 120) for (let x = 20; x < 1400; x += 150) {
      if (rand() < .85) g.fillRect(x + rand() * 8, y + rand() * 8, 110 + rand() * 20, 80 + rand() * 20);
    }
    // 공원과 강
    g.fillStyle = '#DDF1E4'; g.fillRect(170, 920, 280, 220);
    g.fillStyle = '#DCEBFA'; g.beginPath(); g.moveTo(0, 1260); g.bezierCurveTo(400, 1180, 900, 1340, 1400, 1220); g.lineTo(1400, 1400); g.lineTo(0, 1400); g.fill();
    // 길
    const road = (pts, w) => {
      g.lineCap = 'round'; g.lineJoin = 'round';
      [[w + 6, '#D9DCE2'], [w, '#FFFFFF']].forEach(([lw, col]) => {
        g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.moveTo(...pts[0]); pts.slice(1).forEach((p) => g.lineTo(...p)); g.stroke();
      });
    };
    for (let x = 160; x < 1400; x += 300) road([[x, 0], [x + 40, 1400]], 14);
    for (let y = 130; y < 1400; y += 240) road([[0, y], [1400, y - 30]], 14);
    road([[0, 300], [1400, 1100]], 26);
    road([[300, 0], [1000, 1400]], 22);
    // 지하철 노선과 역
    const sx = 700 + STATION.x, sy = 700 - STATION.y;
    g.strokeStyle = '#3CB44A'; g.lineWidth = 9; g.setLineDash([]);
    g.beginPath(); g.moveTo(0, sy + 160); g.quadraticCurveTo(sx - 200, sy + 20, sx, sy); g.quadraticCurveTo(sx + 260, sy - 30, 1400, sy - 260); g.stroke();
    g.fillStyle = '#fff'; g.strokeStyle = '#3CB44A'; g.lineWidth = 7;
    g.beginPath(); g.arc(sx, sy, 22, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = '#202227'; g.font = '700 30px Pretendard, sans-serif'; g.fillText('강남역', sx + 32, sy - 14);
    // 가장자리 페이드
    const fade = g.createRadialGradient(700, 700, 380, 700, 700, 720);
    fade.addColorStop(0, 'rgba(255,255,255,0)'); fade.addColorStop(1, 'rgba(255,255,255,1)');
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = fade; g.fillRect(0, 0, 1400, 1400);
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(MAP, MAP), new THREE.MeshBasicMaterial({ map: texture(c), transparent: true, depthWrite: false }));
    plane.position.set(-STATION.x, -STATION.y, 0); // 역이 그룹 원점에 오게
    map.add(plane);
  }
  function makePin() {
    const c = document.createElement('canvas'); c.width = 80; c.height = 104;
    const g = c.getContext('2d'); g.scale(2, 2);
    g.fillStyle = '#FF5647';
    g.beginPath(); g.moveTo(20, 52); g.bezierCurveTo(20, 52, 0, 35, 0, 20); g.arc(20, 20, 20, Math.PI, 0); g.bezierCurveTo(40, 35, 20, 52, 20, 52); g.fill();
    g.fillStyle = '#fff'; g.beginPath();
    [[20, 10], [22.4, 17.6], [30, 20], [22.4, 22.4], [20, 30], [17.6, 22.4], [10, 20], [17.6, 17.6]].forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.fill();
    return texture(c);
  }
  const pinTexMat = new THREE.MeshBasicMaterial({ map: makePin(), transparent: true, depthWrite: false });
  const pins = [];
  const PIN_AT = [[-40, 60], [90, 30], [10, -90], [-150, -40], [180, -120], [-110, 160], [230, 90], [-230, 60]];
  PIN_AT.forEach(([x, y], i) => {
    const holder = new THREE.Group(); holder.position.set(x, y, 0);
    const pin = new THREE.Mesh(new THREE.PlaneGeometry(40, 52), pinTexMat);
    pin.geometry.translate(0, 26, 0); // 핀 끝이 바닥에 닿게
    pin.rotation.x = Math.PI / 2; // 지도 면에서 똑바로 선다
    holder.add(pin); map.add(holder); pins.push({ holder, pin, i });
  });

  // ---------- ④ 아카이빙 + ⑤ 페이지 ----------
  const archEl = document.querySelector('[data-stage="archive"]');
  const arch = new THREE.Group(); scene.add(arch);
  const archCards = [];
  const ARCH_N = narrow() ? 6 : 10;
  for (let i = 0; i < ARCH_N; i++) {
    const m = card(i + 30);
    const a = rand() * Math.PI * 2;
    m.userData = { ox: Math.cos(a) * (380 + rand() * 340), oy: Math.sin(a) * (300 + rand() * 300) - 200, z: -300 + rand() * 360, rz: (rand() - .5) * .8, d: rand() * .25, ph: rand() * 6 };
    arch.add(m); archCards.push(m);
  }
  const drift = new THREE.Group(); scene.add(drift);
  const driftCards = [];
  const DRIFT_N = innerWidth < 1280 ? 0 : 8; // 여백이 넉넉한 화면에서만: 글을 가리지 않게
  for (let i = 0; i < DRIFT_N; i++) {
    const m = card(i + 60);
    const side = i % 2 ? 1 : -1;
    m.userData = { side, edge: 30 + rand() * 50, docY: 900 + i * 520 + rand() * 200, depth: .3 + rand() * .9, z: -500 + rand() * 300, rz: (rand() - .5) * .7, ph: rand() * 6 };
    drift.add(m); driftCards.push(m);
  }

  // ---------- 입력 ----------
  let mx = 0, my = 0, cmx = 0, cmy = 0;
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    mx = clamp(e.clientX / vw * 2 - 1, -1, 1); my = clamp(e.clientY / vh * 2 - 1, -1, 1);
  }, { passive: true });

  // ---------- 루프 ----------
  let raf = 0, running = false;
  const start = () => { if (!running) { running = true; raf = requestAnimationFrame(frame); } };
  const stop = () => { running = false; cancelAnimationFrame(raf); };
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

  function frame(now) {
    if (!running) return;
    const t = now / 1000;
    const touch = !matchMedia('(pointer: fine)').matches;
    const tx = touch ? Math.sin(t * .4) * .25 : mx, ty = touch ? Math.cos(t * .33) * .2 : my;
    cmx += (tx - cmx) * .06; cmy += (ty - cmy) * .06;
    camera.position.set(cmx * 70, -cmy * 45, camZ);
    camera.lookAt(cmx * 20, -cmy * 12, 0);

    // ① 히어로
    const h = anchor(heroEl);
    hero.visible = h.bottom > -200;
    if (hero.visible) {
      const out = clamp(scrollY / vh, 0, 1.5); // 스크롤하면 카메라 쪽으로 빠져나간다
      const R = h.h * .55;
      heroCards.forEach((m, i) => {
        const u = m.userData;
        u.bump *= .9;
        m.position.set(h.x + u.ax * R, h.y + u.ay * R + Math.sin(t * .6 + u.ph) * 10 + out * 120 * (1 + u.z / 600), u.z + out * 380 * (i % 2 ? 1 : .6));
        m.rotation.set(Math.sin(t * .5 + u.ph) * .08, u.ry + Math.cos(t * .4 + u.ph) * .1, u.rz + Math.sin(t * .3 + u.ph) * .05 + u.bump * .15);
        m.scale.setScalar(u.s * (1 + u.bump * .08));
      });
      for (let i = pops.length - 1; i >= 0; i--) {
        const m = pops[i], u = m.userData, k = (now - u.t0) / 2200;
        if (k >= 1) { hero.remove(m); m.geometry.dispose(); m.material.map.dispose(); m.material.dispose(); pops.splice(i, 1); continue; }
        const e = 1 - Math.pow(1 - k, 3);
        m.position.set(h.x + u.dir * e * h.w * .75, h.y + (u.vy * e * 380) - k * k * 120, -60 + e * 420);
        m.rotation.set(0, u.dir * e * .5, u.rz * e);
        m.scale.setScalar(.4 + e * .9);
        m.material.opacity = k < .75 ? 1 : 1 - (k - .75) / .25;
      }
    }

    // ② 지도: 섹션을 지나는 진행도 p(0 → 1)
    const g = anchor(mapEl);
    const ms = mapSec.getBoundingClientRect(); // 진행도는 섹션 기준(데스크톱에서 폰이 고정돼도 계속 진행)
    map.visible = ms.bottom > -300 && ms.top < vh + 300;
    if (map.visible) {
      const p = clamp((vh - ms.top) / (vh + ms.height), 0, 1);
      const s = lerp(.55, .95, smooth(.1, .75, p)) * (narrow() ? .7 : 1);
      // 섹션에 들어올 때 나타나고, 다음 섹션으로 넘어가며 사라진다
      const fade = smooth(.05, .25, p) * (1 - smooth(.78, .95, p));
      map.children[0].material.opacity = fade;
      pinTexMat.opacity = fade;
      map.position.set(g.x + (narrow() ? 0 : 60), g.y - 40, -260 + p * 120); // 글 쪽으로 덜 번지게 오른쪽으로
      map.rotation.set(lerp(-1.18, -0.92, p), 0, lerp(.35, -.12, p));
      map.scale.setScalar(s);
      pins.forEach(({ pin, i }) => {
        const k = smooth(.18 + i * .055, .3 + i * .055, p);
        pin.scale.set(k, k * (1 + Math.max(0, Math.sin(k * Math.PI)) * .25), 1);
        pin.position.z = Math.sin(t * 2 + i) * 3 * k;
      });
    }

    // ④ 아카이빙: p .15 → .65 동안 폰 안으로 빨려 들어간다
    const a = anchor(archEl);
    arch.visible = a.bottom > -300 && a.top < vh + 600;
    if (arch.visible) {
      const p = clamp((vh - a.top) / (vh + a.h), 0, 1);
      archCards.forEach((m) => {
        const u = m.userData;
        const k = smooth(.15 + u.d, .6 + u.d, p);
        const e = k * k;
        const fx = a.x + u.ox, fy = a.y + u.oy + Math.sin(t * .7 + u.ph) * 12;
        m.position.set(lerp(fx, a.x, e), lerp(fy, a.y + 40, e), lerp(u.z, -40, e));
        m.rotation.set(0, (1 - k) * Math.sin(t * .5 + u.ph) * .2, lerp(u.rz, 0, k));
        m.scale.setScalar(lerp(1, .18, e));
        m.material.opacity = 1 - smooth(.8, 1, k);
      });
    }

    // ⑤ 페이지 흐름
    driftCards.forEach((m) => {
      const u = m.userData;
      const y = vh / 2 - (u.docY - scrollY * u.depth);
      m.position.set(u.side * (vw / 2 - u.edge), y + Math.sin(t * .5 + u.ph) * 8, u.z);
      m.rotation.set(0, u.side * -.25, u.rz + Math.sin(t * .3 + u.ph) * .05);
      m.visible = Math.abs(y) < vh;
    });

    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }

  // 첫 프레임 전에 셰이더를 컴파일해 둔다
  renderer.compile(scene, camera);
  root.classList.add('has-stage');
  start();
}
