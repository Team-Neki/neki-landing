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
  const texture = (c) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t; }; // 기울어진 핀도 선명하게

  // ---------- 지도: 세 면으로 접힌 지도가 펼쳐진다 ----------
  const mapEl = document.querySelector('[data-stage="map"]');
  const mapSec = mapEl.closest('section');
  const mapSteps = mapSec.querySelector('[data-steps]');
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

  // 브랜드 핀: 앱 지도와 같은 둥근 사각 말풍선 + 브랜드 로고 + 이름.
  // 흩어진 공중에서 날아와 지도 위 제자리에 꽂힌다(M1 "흩어진 포토부스가 한 지도로").
  // 핀은 3D 텍스처가 아니라 HTML로 그린다(텍스처는 아무리 해상도를 올려도 축소·보간 때문에 살짝 흐리다).
  // 3D에는 위치만 가진 빈 물체를 두고, 매 프레임 그 자리를 화면 좌표로 바꿔 HTML 핀을 옮긴다(아래 frame()).
  // 모양은 디자인시스템(피그마 Pin > btn_pin_map, click=off): 말풍선은 피그마 벡터 경로, 로고는 피그마 원본(600px)
  const PIN_W = 110, PIN_H = 146; // 핀 한 개 크기(px) = 3D 단위
  const PIN_PATH = 'M29.5 1.5C36.0109 1.5 39.2662 1.50009 41.9287 2.25098C48.626 4.13981 53.8602 9.37397 55.749 16.0713C56.4999 18.7337 56.5 21.9893 56.5 28.5C56.5 35.0108 56.4999 38.2663 55.749 40.9287C53.8602 47.626 48.626 52.8602 41.9287 54.749C39.8628 55.3317 37.4398 55.46 33.416 55.4893L29.3691 62.5L25.3203 55.4883C21.4536 55.4551 19.0917 55.3188 17.0713 54.749C10.374 52.8602 5.13983 47.626 3.25098 40.9287C2.50009 38.2663 2.5 35.0108 2.5 28.5C2.5 21.9893 2.50014 18.7337 3.25098 16.0713C5.13981 9.37397 10.374 4.13981 17.0713 2.25098C19.7338 1.50009 22.9891 1.5 29.5 1.5Z';
  const STAR_PATH = 'M28.8899 19.9774C29.0492 19.3409 29.9535 19.3409 30.1129 19.9774L31.6956 26.3114L38.0226 27.894C38.6592 28.0533 38.6591 28.9575 38.0226 29.1169L31.6931 30.6983L30.1129 37.0224C29.9536 37.6592 29.0491 37.6592 28.8899 37.0224L27.3084 30.6995L20.9777 29.1169C20.3408 28.9577 20.3408 28.0532 20.9777 27.894L27.3059 26.3114L28.8899 19.9774Z';
  const pinLayer = document.createElement('div');
  pinLayer.className = 'pin-layer'; pinLayer.setAttribute('aria-hidden', 'true');
  mapEl.prepend(pinLayer); // 무대 안(폰 아래 층)에 둔다
  function makeBrandPin(b) {
    const el = document.createElement('div'); el.className = 'pin3d';
    el.innerHTML = `<svg class="pin3d__shape" viewBox="0 0 59 66"><path d="${PIN_PATH}"/></svg>` +
      (b.img ? `<img class="pin3d__logo" src="${b.img}" alt="">`
        : `<svg class="pin3d__logo pin3d__logo--empty" viewBox="4.5 3.5 50 50"><path d="${STAR_PATH}"/></svg>`) + // 기본 핀(브랜드 없음)
      `<b class="pin3d__name">${b.name}</b>` +
      (b.target ? '<div class="pin3d__card"><b>인생네컷 사당역점</b><span>도보 4분 · 300m</span><i>길찾기</i></div>' : '');
    pinLayer.appendChild(el);
    return el;
  }
  // 도착점(x, y)은 펼친 지도 기준 좌표. 화면 가운데 폰(±125)에 가려지지 않게 양옆 면에 꽂는다.
  // 출발점(sx, sy, sz)은 도착점에서 얼마나 떨어져 있는지(sz는 지도 위 공중 높이), r은 날아오며 도는 각도.
  const BRANDS = [
    { name: '하루필름', img: 'img/pins/logo-haru.webp', x: -340, y: 370, sx: -260, sy: 520, sz: 520, r: -.5 },
    { name: '포토시그니처', img: 'img/pins/logo-sig.webp', x: 300, y: 340, sx: 260, sy: 560, sz: 560, r: .45 },
    { name: '인생네컷', img: 'img/pins/logo-insaeng.webp', x: -370, y: 10, sx: -520, sy: 60, sz: 380, r: .4, target: true }, // 검색 대상
    { name: '포토그레이', img: 'img/pins/logo-gray.webp', x: 470, y: 150, sx: 520, sy: 160, sz: 420, r: -.5 },
    { name: '포토이즘', img: 'img/pins/logo-photoism.webp', x: -330, y: -360, sx: -300, sy: -560, sz: 640, r: .55 },
    { name: '플랜비 스튜디오', img: 'img/pins/logo-planb.webp', x: 300, y: -40, sx: 300, sy: -420, sz: 700, r: .35 },
    { name: '포토랩+', x: 470, y: -240, sx: 480, sy: -260, sz: 300, r: -.4 },
    { name: '돈룩업', x: 300, y: -400, sx: 200, sy: -640, sz: 340, r: -.5 }
  ];
  const pins = BRANDS.map((b, i) => {
    const el = makeBrandPin(b);
    const pin = new THREE.Object3D(); // 위치·방향·크기만 가진 빈 물체. 원점 = 핀 아래 끝
    // 양옆 면의 경첩에 붙여야 지도가 접히고 펴질 때 같이 움직인다
    const hinge = b.x < 0 ? leftHinge : rightHinge;
    const land = new THREE.Vector3(b.x < 0 ? b.x + PW / 2 : b.x - PW / 2, b.y, 0);
    const holder = new THREE.Group(); holder.add(pin); hinge.add(holder);
    return { b, i, pin, el, holder, land, op: 0 };
  });

  // ---------- 검색 → 고르기 → 찾아가기: 폰 속 장면에 맞춰 3D 지도도 반응한다 ----------
  // main.js가 남기는 값을 읽는다: 단계(data-step)와 "검색해요" 스크롤 진행(--s, 0→1)
  const flowEl = document.querySelector('[data-mapflow]');
  const step0El = mapSteps.querySelector('li');
  const target = pins.find((p) => p.b.target);
  // 검색 대상 핀 아래 퍼지는 빨간 물결
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xFF5647, transparent: true, depthWrite: false, opacity: 0 });
  const ring = new THREE.Mesh(new THREE.RingGeometry(30, 38, 48), ringMat);
  ring.position.z = 1; target.holder.add(ring);
  // 고르기: 핀 위 정보 카드(HTML, 대상 핀 안에 있다)
  const card = target.el.querySelector('.pin3d__card');
  const P = new THREE.Vector3(), Q = new THREE.Vector3();
  const toScreen = (v) => { v.project(camera); return [(v.x + 1) / 2 * vw, (1 - v.y) / 2 * vh]; };
  // 찾아가기: 내 위치(폰에 안 가리는 왼쪽 아래)에서 인생네컷 핀까지 길을 따라 빨간 선이 그려진다(가운데 면 좌표)
  const ME = new THREE.Vector3(-270, -330, 3);
  const route = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3([ME, new THREE.Vector3(-265, -190, 3), new THREE.Vector3(-300, -130, 3), new THREE.Vector3(-365, -100, 3), new THREE.Vector3(-370, 10, 3)], false, 'catmullrom', .2), 80, 7, 8, false),
    new THREE.MeshBasicMaterial({ color: 0xFF5647, transparent: true, depthWrite: false, depthTest: false })
  );
  route.renderOrder = 2; // 반투명 지도 면 위에 그린다
  const routeCount = route.geometry.index.count;
  route.geometry.setDrawRange(0, 0); mid.add(route);
  // 내 위치 점: 흰 테두리 빨간 점 + 옅은 빨간 원
  const meDot = new THREE.Group(); meDot.position.copy(ME); meDot.position.z = 4; mid.add(meDot);
  const meMats = [[34, 0xFF5647, .22], [17, 0xFFFFFF, 1], [11, 0xFF5647, 1]].map(([r, c, o], k) => {
    const m = new THREE.MeshBasicMaterial({ color: c, transparent: true, depthWrite: false, depthTest: false, opacity: 0 });
    const d = new THREE.Mesh(new THREE.CircleGeometry(r, 40), m); d.position.z = k; d.renderOrder = 3 + k; meDot.add(d);
    return [m, o];
  });
  let cardK = 0, routeK = 0, lastT = 0, arriveT = 0;
  const stepLastEl = mapSteps.querySelector('li:last-child');
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

    // 지도: 도입 진행도 pg(0 → 1)로 접힘 → 펼침 → 브랜드 핀 착지. 사라짐은 섹션 진행도 p로.
    // pg는 main.js의 폰 지도 선명도·검색 시작과 같은 식이라 핀이 다 꽂힌 순간 검색이 시작된다.
    const ms = mapSec.getBoundingClientRect();
    map.visible = wide() && ms.bottom > -300 && ms.top < vh + 300;
    pinLayer.hidden = !map.visible;
    if (map.visible) {
      const g = anchor(flowEl); // 폰 가운데 기준. 폰 크기(화면 높이에 따라 바뀜)에 맞춰 지도도 줄인다
      const fit = g.h / 541;
      const p = clamp((vh - ms.top) / (vh + ms.height), 0, 1);
      const pg = clamp((vh * 1.65 - mapSteps.getBoundingClientRect().top) / (vh * .85), 0, 1);
      const open = smooth(0, .5, pg);
      const fold = (1 - open) * 1.25;
      leftHinge.rotation.y = fold; rightHinge.rotation.y = fold;
      shade(panels[0], lerp(.86, 1, open)); shade(panels[2], lerp(.86, 1, open));
      const fade = smooth(.02, .1, p) * (1 - smooth(.86, .97, p));
      panels.forEach((m) => { m.material.opacity = fade; });
      // 검색 단계: 검색창 탭(hush) → '인생네컷' 입력(focus) → 결과(zoom). 그 뒤 단계는 다 켠 채로
      const stepN = +flowEl.dataset.step || 0;
      const sv = parseFloat(step0El.style.getPropertyValue('--s')) || 0;
      const hush = stepN ? 1 : smooth(.1, .2, sv);
      const focus = stepN ? 1 : smooth(.4, .52, sv);
      const zoom = stepN ? 1 : smooth(.68, .88, sv);
      // 카드·길은 단계가 바뀌면 시간에 따라 다가간다(화면 주사율과 상관없이 같은 속도)
      const dt = Math.min(.1, t - lastT); lastT = t;
      cardK += ((stepN >= 1 ? 1 : 0) - cardK) * (1 - Math.exp(-dt * 9));
      // 길: main.js가 찾아가요 칸에 남긴 스크롤 진행(--r)을 부드럽게 따라간다
      const rv = stepN >= 2 ? parseFloat(stepLastEl.style.getPropertyValue('--r')) || 0 : 0;
      routeK += (rv - routeK) * (1 - Math.exp(-dt * 12));
      // 도착: 길이 핀에 닿는 순간 인생네컷 핀이 한 번 통 튄다
      if (routeK > .985 && !arriveT) arriveT = t; else if (routeK < .9) arriveT = 0;
      const arrive = arriveT ? Math.sin(clamp((t - arriveT) / .45, 0, 1) * Math.PI) : 0;
      // 전체 무대: 지도는 화면 가운데 폰 뒤에 넓게 깔린다
      map.position.set(g.x + zoom * 40 * fit, g.y - zoom * 20 * fit, (-320 + open * 140 + zoom * 120) * fit);
      map.rotation.set(lerp(-.55, -1.0, open), lerp(-.5, 0, open), lerp(.25, -.08, open));
      map.scale.setScalar(lerp(.5, 1, open) * fit);
      pins.forEach((pp) => {
        const { b, i, pin, holder, land } = pp;
        // 날아오는 진행(e): 하나씩 순서대로 출발. k = 아직 남은 거리
        const e = 1 - Math.pow(1 - clamp((pg - .08 - i * .06) / .42, 0, 1), 3);
        const k = 1 - e;
        holder.position.set(land.x + b.sx * k, land.y + b.sy * k, b.sz * k);
        // 공중에선 카메라를 정면으로 보며(로고가 읽히게) 살짝 돌다가, 내려앉으며 지도 위에 선다
        pin.rotation.set(lerp(-map.rotation.x, 1.25, e), b.r * k * .5, b.r * k);
        const land01 = smooth(.9, 1, e), bounce = Math.sin(land01 * Math.PI) * .18;
        // 검색 반응: 대상 핀은 커지며 솟고, 나머지는 숨죽였다가 흐려지며 내려앉는다
        const react = b.target ? 1 + .4 * focus + .2 * arrive : (1 - .12 * hush) * (1 - .25 * focus);
        const s = lerp(2.1, 1.05, e) * react;
        pin.scale.set(s * (1 + bounce * .4), s * (1 - bounce * .3 + bounce), 1);
        pin.position.z = Math.sin(t * 2 + i) * 3 * e + (b.target ? 36 * focus + Math.sin(t * 3) * 6 * focus : 0);
        pp.op = fade * (b.target ? 1 : 1 - .5 * focus); // 너무 흐리면 깨져 보여서 절반만
      });
      // HTML 핀을 3D 자리로: 핀 아래 끝(P)과 위 끝(Q)을 화면 좌표로 바꿔 위치·기울기·크기를 맞춘다
      camera.updateMatrixWorld(); map.updateMatrixWorld(true);
      pins.forEach(({ pin, el, op }) => {
        P.set(0, 0, 0); pin.localToWorld(P); Q.set(0, PIN_H, 0); pin.localToWorld(Q);
        const [bx, by] = toScreen(P), [qx, qy] = toScreen(Q);
        const sc = Math.hypot(qx - bx, qy - by) / PIN_H, ang = Math.atan2(qx - bx, by - qy);
        el.style.transform = `translate(${bx.toFixed(1)}px,${by.toFixed(1)}px) rotate(${ang.toFixed(3)}rad) scale(${sc.toFixed(3)})`;
        el.style.opacity = op.toFixed(3);
        el.style.zIndex = Math.round(by); // 화면 아래(앞)에 있는 핀이 위로
      });
      const wave = (t * .9) % 1;
      ring.scale.setScalar(1 + wave * 2.2);
      ringMat.opacity = fade * focus * (1 - wave) * .8;
      card.style.opacity = cardK.toFixed(3); card.style.transform = `scale(${(.6 + .4 * cardK).toFixed(3)})`;
      route.geometry.setDrawRange(0, Math.floor(routeCount * routeK / 3) * 3);
      route.material.opacity = fade;
      const meK = smooth(0, .15, routeK);
      meMats.forEach(([m, o]) => { m.opacity = fade * meK * o; });
      meDot.scale.setScalar(.6 + .4 * meK);
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
