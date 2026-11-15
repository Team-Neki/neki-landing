/* NEKI 랜딩 v2 3D 무대 (three.js r170). 방향은 CONCEPT.md
   화면에 고정된 캔버스 하나가 섹션 배경 위, 글 아래에 깔린다.
   - 좌표: z=0 평면에서 3D 1단위 = CSS 1px. 물체는 DOM 앵커([data-stage])를 매 프레임 따라간다.
   - 히어로 3D 카드는 뺐다(빨강 면 위아래로 잘려 보여 어색했다). 히어로는 셔터 인화가 주인공이다.
   - 지도(데스크톱만): 심볼처럼 세 면으로 접힌 지도가 스크롤에 따라 펼쳐지고, 다 펴지면 별 핀이 솟는다.
     좁은 화면은 접힌 지도 그래픽(img/graphic/map-fold.webp)이 대신한다.
   - 끄는 경우: 모션 최소화, 데이터 절약·2g/3g·메모리 4GB 미만, WebGL 없음 → DOM만으로 완성된 모습 */

const root = document.documentElement;
const canvas = document.querySelector('.stage3d');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const conn = navigator.connection;
const weak = (conn && (conn.saveData || /(^|-)2g$|^3g$/.test(conn.effectiveType || ''))) ||
  (navigator.deviceMemory && navigator.deviceMemory < 4);

// 3D는 데스크톱(1024px 이상) 지도에만 쓴다. 나머지 인터랙션은 모두 DOM으로 동작한다
if (canvas && !reduce && !weak && innerWidth >= 1024) {
  const kick = () => (window.requestIdleCallback || ((f) => setTimeout(f, 300)))(() => init().catch(off), { timeout: 1500 });
  if (document.readyState === 'complete') kick(); else addEventListener('load', kick, { once: true });
}

function off() { root.classList.remove('has-stage'); }

async function init() {
  const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js');
  const narrow = () => innerWidth < 768;
  const wide = () => innerWidth >= 1024;

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

  const anchor = (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2 - vw / 2, y: vh / 2 - (r.top + r.height / 2), w: r.width, h: r.height, top: r.top, bottom: r.bottom };
  };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const texture = (c) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };

  // ---------- 지도: 세 면으로 접힌 지도가 펼쳐진다 ----------
  const mapEl = document.querySelector('[data-stage="map"]');
  const mapSec = mapEl.closest('section');
  const map = new THREE.Group(); scene.add(map);
  const MAP_W = 1080, MAP_H = 760, PW = MAP_W / 3;
  const STATION = { x: 560, y: 380 }; // 텍스처 좌표(px)
  const mapCanvas = (() => {
    const c = document.createElement('canvas'); c.width = MAP_W; c.height = MAP_H;
    const g = c.getContext('2d');
    const r = 36;
    g.beginPath(); g.roundRect(0, 0, MAP_W, MAP_H, r); g.clip();
    g.fillStyle = '#FFF6F5'; g.fillRect(0, 0, MAP_W, MAP_H);
    g.fillStyle = '#FFE3E0'; // 블록
    for (let y = 18; y < MAP_H; y += 110) for (let x = 18; x < MAP_W; x += 140) {
      if (rand() < .85) { g.beginPath(); g.roundRect(x + rand() * 8, y + rand() * 8, 100 + rand() * 16, 72 + rand() * 14, 10); g.fill(); }
    }
    g.fillStyle = '#FFDAD6'; g.beginPath(); g.roundRect(120, 520, 220, 160, 24); g.fill(); // 공원
    const road = (pts, w) => {
      g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#FFFFFF'; g.lineWidth = w;
      g.beginPath(); g.moveTo(...pts[0]); pts.slice(1).forEach((p) => g.lineTo(...p)); g.stroke();
    };
    for (let x = 150; x < MAP_W; x += 280) road([[x, 0], [x + 30, MAP_H]], 12);
    for (let y = 120; y < MAP_H; y += 220) road([[0, y], [MAP_W, y - 24]], 12);
    road([[0, 200], [MAP_W, 640]], 22);
    // 지하철 노선과 역
    g.strokeStyle = '#FF786B'; g.lineWidth = 8;
    g.beginPath(); g.moveTo(0, STATION.y + 140); g.quadraticCurveTo(STATION.x - 180, STATION.y + 20, STATION.x, STATION.y); g.quadraticCurveTo(STATION.x + 240, STATION.y - 30, MAP_W, STATION.y - 220); g.stroke();
    g.fillStyle = '#fff'; g.strokeStyle = '#FF5647'; g.lineWidth = 7;
    g.beginPath(); g.arc(STATION.x, STATION.y, 18, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = '#202227'; g.font = '700 28px Pretendard, sans-serif'; g.fillText('강남역', STATION.x + 28, STATION.y - 14);
    return c;
  })();
  // 세 면: 가운데 면이 원점, 양옆 면이 경첩에서 접힌다(Z자)
  const panels = [0, 1, 2].map((i) => {
    const t = texture(mapCanvas);
    t.repeat.set(1 / 3, 1); t.offset.set(i / 3, 0);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(PW, MAP_H), new THREE.MeshBasicMaterial({ map: t, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    return m;
  });
  const mid = new THREE.Group(); mid.add(panels[1]); map.add(mid);
  const leftHinge = new THREE.Group(); leftHinge.position.x = -PW / 2; mid.add(leftHinge);
  panels[0].position.x = -PW / 2; leftHinge.add(panels[0]);
  const rightHinge = new THREE.Group(); rightHinge.position.x = PW / 2; mid.add(rightHinge);
  panels[2].position.x = PW / 2; rightHinge.add(panels[2]);
  // 접힌 면이 살짝 어둡게: 면마다 색을 곱한다
  const shade = (m, k) => m.material.color.setScalar(k);

  function makePin() { // 앱 지도 핀: 둥근 사각 말풍선 + 흰 별
    const c = document.createElement('canvas'); c.width = 112; c.height = 136;
    const g = c.getContext('2d'); g.scale(2, 2);
    const gr = g.createLinearGradient(0, 0, 56, 56); gr.addColorStop(0, '#FF786B'); gr.addColorStop(1, '#FF5647');
    g.fillStyle = '#fff'; g.beginPath(); g.roundRect(0, 0, 56, 56, 20); g.fill();
    g.beginPath(); g.moveTo(20, 54); g.lineTo(28, 66); g.lineTo(36, 54); g.fill();
    g.fillStyle = gr; g.beginPath(); g.roundRect(3, 3, 50, 50, 18); g.fill();
    g.fillStyle = '#fff'; g.beginPath();
    [[28, 15], [30.6, 25.4], [41, 28], [30.6, 30.6], [28, 41], [25.4, 30.6], [15, 28], [25.4, 25.4]].forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.fill();
    return texture(c);
  }
  const pinMat = new THREE.MeshBasicMaterial({ map: makePin(), transparent: true, depthWrite: false });
  const pins = [];
  [[-60, 40], [90, 90], [20, -110], [-130, -60], [130, -30]].forEach(([x, y], i) => {
    const holder = new THREE.Group(); holder.position.set(x, y, 0);
    const pin = new THREE.Mesh(new THREE.PlaneGeometry(56, 68), pinMat);
    pin.geometry.translate(0, 34, 0); pin.rotation.x = Math.PI / 2; // 지도 면에서 똑바로 선다
    holder.add(pin); mid.add(holder); pins.push({ pin, i });
  });
  // 역이 가운데 면 중앙 근처에 오게 텍스처를 맞춰 두었다

  // ---------- 입력 ----------
  let mx = 0, my = 0, cmx = 0, cmy = 0;
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    mx = clamp(e.clientX / vw * 2 - 1, -1, 1); my = clamp(e.clientY / vh * 2 - 1, -1, 1);
  }, { passive: true });

  // ---------- 루프 ----------
  let raf = 0, running = false, drawn = true;
  const start = () => { if (!running) { running = true; raf = requestAnimationFrame(frame); } };
  const stop = () => { running = false; cancelAnimationFrame(raf); };
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

  function frame(now) {
    if (!running) return;
    const t = now / 1000;
    const touch = !matchMedia('(pointer: fine)').matches;
    const tx = touch ? Math.sin(t * .4) * .25 : mx, ty = touch ? Math.cos(t * .33) * .2 : my;
    cmx += (tx - cmx) * .06; cmy += (ty - cmy) * .06;
    camera.position.set(cmx * 60, -cmy * 40, camZ);
    camera.lookAt(cmx * 18, -cmy * 10, 0);

    // 지도: 섹션 진행도 p(0 → 1). 접힘 → 펼침 → 핀
    const ms = mapSec.getBoundingClientRect();
    map.visible = wide() && ms.bottom > -300 && ms.top < vh + 300;
    if (map.visible) {
      const g = anchor(mapEl);
      const p = clamp((vh - ms.top) / (vh + ms.height), 0, 1);
      const open = smooth(.12, .42, p);
      const fold = (1 - open) * 1.25;
      leftHinge.rotation.y = fold; rightHinge.rotation.y = fold;
      shade(panels[0], lerp(.86, 1, open)); shade(panels[2], lerp(.86, 1, open));
      const fade = smooth(.04, .16, p) * (1 - smooth(.86, .97, p));
      panels.forEach((m) => { m.material.opacity = fade; });
      pinMat.opacity = fade;
      // 글 칸을 침범하지 않게: 폰 뒤에 작게, 오른쪽으로 치우쳐서
      map.position.set(g.x + 40, g.y - 20, -320 + open * 140);
      map.rotation.set(lerp(-.55, -1.0, open), lerp(-.5, 0, open), lerp(.25, -.08, open));
      map.scale.setScalar(lerp(.4, .62, open));
      pins.forEach(({ pin, i }) => {
        const k = smooth(.42 + i * .04, .5 + i * .04, p);
        pin.scale.set(k, k * (1 + Math.max(0, Math.sin(k * Math.PI)) * .25), 1);
        pin.position.z = Math.sin(t * 2 + i) * 3 * k;
      });
    }

    // 지도가 화면 밖이면 그리지 않는다(빈 화면으로 한 번만 지우고 쉰다)
    if (map.visible || drawn) renderer.render(scene, camera);
    drawn = map.visible;
    raf = requestAnimationFrame(frame);
  }

  renderer.compile(scene, camera);
  root.classList.add('has-stage');
  start();
}
