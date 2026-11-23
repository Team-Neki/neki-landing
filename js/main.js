/* NEKI 랜딩 v2: 3D 무대 밖의 동작 (방향은 CONCEPT.md)
   1) OS 스토어  2) 헤더·진행 막대  3) 등장 효과  4) 공감 단톡방  5) 히어로 포토부스(셔터 → 네 번 찰칵)
   6) 필름 띠  7) 지도 단계  8) 포즈 고르기  9) 아카이빙 모여드는 연출  10) 모바일 하단 바 */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var io = 'IntersectionObserver' in window;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var STORE = {
    ios: 'https://apps.apple.com/kr/app/id6757490609',
    android: 'https://play.google.com/store/apps/details?id=com.neki.android'
  };

  // 포즈 사진: NEKI 가상 캐스트(F1·F2·M1·M2) 세트. 히어로 촬영과 필름 띠가 쓴다
  var cast = function (name, n) { var out = []; for (var k = 1; k <= n; k++) out.push([1, 2, 3, 4].map(function (i) { return 'img/cast/' + name + '-' + k + '-' + i + '.webp'; })); return out; };
  var POSES = {
    '1': { label: '1인', sets: cast('solo', 1) },
    '2-friend': { label: '2인 · 친구', sets: cast('friend', 6) },
    '2-some': { label: '2인 · 썸', sets: cast('ssum', 6) },
    '2-couple': { label: '2인 · 커플', sets: cast('couple', 6) }
  };
  var CAST_KEYS = ['1', '2-friend', '2-some', '2-couple'];
  var shuffle = function (a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; };

  // 1) 단일 다운로드 버튼은 방문자 OS의 스토어로. 데스크톱이면 #download로 둔다.
  var ua = navigator.userAgent;
  var os = /android/i.test(ua) ? 'android' : /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) ? 'ios' : null;
  if (os) {
    $$('[data-store]').forEach(function (a) { a.href = STORE[os]; });
    $$('.stores').forEach(function (box) { var mine = $('[data-os="' + os + '"]', box); if (mine) box.prepend(mine); });
  }

  // PC 방문자용 QR: 휴대폰으로 찍으면 app.html이 OS에 맞는 스토어로 보낸다
  var qrBox = $('[data-qr-box]');
  if (qrBox && !os && window.qrcode) {
    var q = window.qrcode(0, 'M');
    q.addData(new URL('app.html', location.href).href);
    q.make();
    $('[data-qr]', qrBox).innerHTML = q.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
    qrBox.hidden = false;
  }

  // FAQ: 하나를 열면 나머지는 닫힌다 (답은 HTML에 그대로 있어 검색엔진도 읽는다)
  $$('.qa__q').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var item = btn.parentNode, open = !item.classList.contains('is-open');
      $$('.qa').forEach(function (q) { q.classList.remove('is-open'); $('.qa__q', q).setAttribute('aria-expanded', 'false'); });
      item.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
    });
  });

  // 2) 헤더 배경 + 진행 막대
  var header = $('[data-header]');
  var tick = false;
  function onScroll() {
    tick = false;
    var max = Math.max(1, root.scrollHeight - innerHeight);
    header.classList.toggle('is-scrolled', scrollY > 8);
    header.style.setProperty('--k', Math.min(1, scrollY / max).toFixed(4));
  }
  addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  // 3) 섹션 등장
  var reveals = $$('.reveal');
  if (!io || reduce) reveals.forEach(function (el) { el.classList.add('is-in'); });
  else {
    var ro = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); ro.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -10% 0px' });
    reveals.forEach(function (el) { ro.observe(el); });
  }

  // 4) 공감 단톡방: 말풍선이 차례로 올라오고, 고민 말풍선이 뜨면 오른쪽 짝 카드가 켜진다.
  var msgs = $$('.msg');
  var room = $('.room');
  var fixes = $$('.fix');
  var light = function (k) {
    fixes.forEach(function (f) { f.classList.toggle('is-on', f.dataset.k === k); });
  };
  fixes.forEach(function (f) {
    f.addEventListener('mouseenter', function () { light(f.dataset.k); });
    f.addEventListener('focusin', function () { light(f.dataset.k); });
  });
  var showMsg = function (el) { el.classList.add('is-in'); if (el.dataset.k) light(el.dataset.k); };
  if (!io || reduce || !room) msgs.forEach(function (el) { el.classList.add('is-in'); });
  else {
    var co = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return;
      co.disconnect();
      msgs.forEach(function (el, i) { setTimeout(function () { showMsg(el); }, 200 + i * 700); });
    }, { rootMargin: '0px 0px -25% 0px' });
    co.observe(room);
  }

  // 스크롤 단계 흐름(지도·아카이빙 공통): 데스크톱은 화면 가운데에 가장 가까운 단계를 켜고,
  // 그보다 좁으면 폰이 보일 때 단계를 자동으로 돌린다(stay = 단계별 머무는 시간)
  var wideMQ = matchMedia('(min-width: 1024px)');
  function stepFlow(sec, phone, onStep, stay) {
    var items = $$('[data-steps] li', sec), cur = -1;
    var set = function (i) { if (i === cur) return; cur = i; items.forEach(function (s, k) { s.classList.toggle('is-on', k === i); }); onStep(i); };
    set(0);
    if (!io) return set;
    var pick = function () {
      if (!wideMQ.matches) return;
      // 윗변이 화면 가운데를 넘은 마지막 단계를 켠다(첫 단계는 스크롤 장면이라 키가 커서, 가운데 기준이면 일찍 넘어간다)
      var mid = innerHeight / 2, best = 0;
      items.forEach(function (s, k) { if (s.getBoundingClientRect().top <= mid) best = k; });
      set(best);
    };
    var tickS = false;
    addEventListener('scroll', function () { if (!tickS) { tickS = true; requestAnimationFrame(function () { tickS = false; pick(); }); } }, { passive: true });
    pick();
    var loop = null;
    new IntersectionObserver(function (es) {
      if (wideMQ.matches || reduce) return;
      var run = function (k) { cur = -1; set(k); loop = setTimeout(function () { run((k + 1) % items.length); }, stay[k]); };
      if (es[0].isIntersecting && !loop) run(0);
      else if (!es[0].isIntersecting) { clearTimeout(loop); loop = null; }
    }, { threshold: .5 }).observe(phone);
    return set;
  }

  // 지도: 검색 단계 장면 = 지도 → 검색창 탭 → 검색 화면에서 "인생네컷 사당" 타이핑 → 결과 → 첫 결과 탭
  var flow = $('[data-mapflow]');
  var typed = $('[data-typed]');
  var phTimers = [];
  var later = function (fn, ms) { phTimers.push(setTimeout(fn, ms)); };
  var WORD = '인생네컷 사당';
  // 모바일: 단계가 시간으로 돌아서 검색 장면도 타이머로 재생한다(지도 mapMs → 탭 → 타이핑 → 결과 → 첫 결과 탭)
  function searchScene(mapMs) {
    var word = WORD;
    var ph = function (name) { flow.dataset.ph = name; };
    typed.textContent = '';
    if (reduce) { typed.textContent = word; return ph('result'); }
    ph('map');
    var m = mapMs;
    later(function () { ph('tapbar'); }, m);
    later(function () { ph('search'); }, m + 700);
    for (var k = 1; k <= word.length; k++) (function (k) { later(function () { typed.textContent = word.slice(0, k); }, m + 1100 + k * 210); })(k);
    var t = m + 1100 + word.length * 210;
    later(function () { ph('result'); }, t + 500);
    later(function () { ph('pick'); }, t + 1700);
  }
  // 데스크톱: 검색 장면이 스크롤을 따라간다(타이머 없음). "검색해요" 글이 화면에 고정된 동안의 진행 s(0→1)를
  // 지도 → 검색창 탭 → 검색 화면 → 한 글자씩 타이핑 → 결과 → 첫 결과 탭으로 나눈다. 멈추면 멈추고, 올리면 되감긴다.
  var step0 = $('#map [data-steps] li');
  function searchAt(s) {
    step0.style.setProperty('--s', s.toFixed(3)); // stage3d.js가 읽어 3D 지도를 반응시킨다
    var ph = s < .1 ? 'map' : s < .18 ? 'tapbar' : s < .7 ? 'search' : s < .85 ? 'result' : 'pick';
    var n = s < .26 ? 0 : Math.min(WORD.length, Math.ceil((s - .26) / .38 * WORD.length));
    if (flow.dataset.ph !== ph) flow.dataset.ph = ph;
    var w = WORD.slice(0, n); if (typed.textContent !== w) typed.textContent = w;
  }
  function searchScroll() {
    if (!wideMQ.matches || flow.dataset.step !== '0') return;
    if (reduce) { typed.textContent = WORD; flow.dataset.ph = 'result'; return; }
    if (!gathered) return searchAt(0);
    var r = step0.getBoundingClientRect();
    // s=0: 단계 칸 윗변이 화면 70% 지점, s=1: "골라요"로 넘어가기 100px 전(넘어가는 지점 = 윗변이 50% - 칸 높이)
    searchAt(clamp01((innerHeight * .7 - r.top) / Math.max(1, r.height + innerHeight * .2 - 100)));
  }
  // 찾아가요: 빨간 길도 스크롤로 그린다. 단계가 켜진 지점(윗변이 화면 가운데)부터 칸 높이의 55%를 내리면 도착,
  // 나머지 45%(+ 섹션 아래 여백)는 도착한 장면에 머문다. stage3d.js가 --r(0→1)을 읽는다
  var stepLast = $('#map [data-steps] li:last-child');
  function routeScroll() {
    if (!wideMQ.matches) return;
    var r = stepLast.getBoundingClientRect();
    var v = flow.dataset.step === '2' ? clamp01((innerHeight * .5 - r.top) / (r.height * .55)) : 0;
    stepLast.style.setProperty('--r', v.toFixed(3));
  }
  // 데스크톱 무대 문구: 다 모이기 전엔 소개, 그다음엔 지금 단계. 아래 진행 막대는 검색 장면 진행(--s)만큼 찬다
  var stageCap = $('.stage-cap'); // 이름 주의: 아래 아카이빙 코드에 같은 함수 범위의 var cap이 있다
  var caps = stageCap ? $$('[data-cap]', stageCap) : [], dots = stageCap ? $$('[data-dot]', stageCap) : [], bars = stageCap ? $$('[data-bar]', stageCap) : [];
  function capUpdate() {
    if (!stageCap) return;
    var st = gathered ? +flow.dataset.step : -1;
    caps.forEach(function (el) { el.classList.toggle('is-on', el.dataset.cap === (st < 0 ? 'intro' : String(st))); });
    stageCap.classList.toggle('is-intro', st < 0);
    dots.forEach(function (el, k) { el.classList.toggle('is-on', k <= st); });
    var s = parseFloat(step0.style.getPropertyValue('--s')) || 0;
    bars[0].style.setProperty('--f', st > 0 ? 1 : st === 0 ? s : 0);
    bars[1].style.setProperty('--f', st > 1 ? 1 : 0);
    if (st === 2) routeScroll();
  }
  // 모바일: 폰이 화면에 들어오면 시작
  var settled = function () { var r = flow.getBoundingClientRect(); return r.top < innerHeight * .75 && r.bottom > innerHeight * .25; };
  var mapStep = function (i) {
    flow.dataset.step = i;
    phTimers.forEach(clearTimeout); phTimers = [];
    if (wideMQ.matches) capUpdate();
    if (i !== 0) { flow.dataset.ph = ''; return; }
    if (wideMQ.matches) return searchScroll();
    if (settled()) searchScene(1100); else { typed.textContent = ''; flow.dataset.ph = 'map'; }
  };

  // 지도 도입: 흩어진 브랜드가 폰 지도 위 같은 핀 자리로 모인다. 데스크톱은 스크롤 진행(p)으로,
  // 모바일은 폰이 보일 때 한 번. 데스크톱에선 다 모여야(gathered) 검색 장면이 시작된다.
  var gather = $('[data-gather]'), mapSteps = $('#map [data-steps]');
  var gathered = !gather || reduce;
  var clamp01 = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };
  var pieces = gather ? $$('[data-d]', gather) : [];
  function setGather(p) {
    pieces.forEach(function (el) { el.style.setProperty('--e', easeOut(clamp01((p - el.dataset.d) / .66)).toFixed(3)); });
    flow.style.setProperty('--g', clamp01((p - .55) / .45).toFixed(3));
    gather.classList.toggle('is-done', p >= 1);
    var was = gathered; gathered = p >= 1;
    if (was !== gathered && wideMQ.matches && flow.dataset.step === '0') mapStep(0);
  }
  if (gather && flow && !reduce) {
    var onGather = function () {
      if (!wideMQ.matches) return;
      // 진행도는 (화면엔 안 보이는) 단계 목록 위치로 잰다. stage3d.js와 같은 식
      var h = innerHeight, st = mapSteps.getBoundingClientRect().top;
      setGather(clamp01((h * 1.65 - st) / (h * .85)));
      searchScroll();
      routeScroll();
      capUpdate();
    };
    var tickG = false;
    addEventListener('scroll', function () { if (!tickG) { tickG = true; requestAnimationFrame(function () { tickG = false; onGather(); }); } }, { passive: true });
    if (wideMQ.matches) onGather();
    else {
      setGather(0);
      if (io) new IntersectionObserver(function (es, ob) {
        if (!es[0].isIntersecting) return;
        ob.disconnect();
        var t0 = performance.now();
        (function step(now) { var p = clamp01((now - t0) / 1000); setGather(p); if (p < 1) requestAnimationFrame(step); })(t0);
      }, { threshold: .5 }).observe(flow);
      else setGather(1);
    }
  }

  if (flow) {
    stepFlow($('#map'), flow, mapStep, [6800, 2800, 2800]);
  }

  // 헤더 메뉴: 지금 보는 섹션
  if (io) {
    var navs = $$('.header__nav a');
    var no = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) navs.forEach(function (a) { a.classList.toggle('is-on', a.getAttribute('href') === '#' + e.target.id); });
      });
    }, { rootMargin: '-50% 0px -50% 0px' });
    navs.forEach(function (a) { var s = $(a.getAttribute('href')); if (s) no.observe(s); });
    ['#top', '#why', '#download'].forEach(function (id) { var s = $(id); if (s) no.observe(s); }); // 메뉴 없는 섹션에서는 밑줄을 끈다
  }

  // 5) 히어로 포토부스: 셔터 → 3·2·1 → 네 번 찰칵, 한 칸씩 채워진다.
  //    찍은 네컷은 아카이빙(옮길 카드)과 다운로드(2x2 인화)로 이어진다.
  var today = (function () { var d = new Date(); var p = function (n) { return (n < 10 ? '0' : '') + n; }; return d.getFullYear() + '.' + p(d.getMonth() + 1) + '.' + p(d.getDate()); })();
  var FRAMES = ['', 'red', 'pink'];
  var pick = function (a) { return a[Math.floor(Math.random() * a.length)]; };
  var mine = { photos: POSES['2-friend'].sets[0], frame: '' };
  function renderStrips() {
    $$('[data-mystrip]').forEach(function (fig) {
      fig.classList.remove('mystrip--red', 'mystrip--pink');
      if (mine.frame) fig.classList.add('mystrip--' + mine.frame);
      fig.innerHTML = mine.photos.map(function (src) { return '<img src="' + src + '" alt="" width="360" height="480">'; }).join('') +
        '<figcaption><b>NEKI</b>' + today + '</figcaption>';
    });
  }
  renderStrips();

  var cut4 = $('[data-cut4]');
  var cells = $$('.cut4__cell', cut4);
  var shutter = $('[data-shutter]');
  var count = $('[data-count]');
  var status = $('[data-status]');
  var flash = $('.flash');
  $('[data-date]', cut4).textContent = today;
  var bang = function (el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
  var setFrame = function (f) { cut4.classList.remove('cut4--red', 'cut4--pink'); if (f) cut4.classList.add('cut4--' + f); };

  var run = 0; // 찍는 중에 다시 누르면 run이 바뀌어 이전 촬영의 남은 타이머는 그냥 끝난다
  function shoot() {
    var id = ++run;
    var later = function (fn, ms) { setTimeout(function () { if (id === run) fn(); }, ms); };
    var p = POSES[pick(CAST_KEYS)];
    var photos = pick(p.sets), frame = pick(FRAMES);
    shutter.classList.add('is-busy');
    count.classList.remove('is-tick'); count.textContent = '';
    setFrame(frame);
    cells.forEach(function (c, i) { c.classList.remove('is-shot', 'is-live'); c.classList.add('is-empty'); $('img', c).src = photos[i]; });
    status.textContent = p.label + ' 포즈로 찍어요';
    var done = function () {
      mine = { photos: photos, frame: frame };
      renderStrips();
      resetArchive();
      dispatchEvent(new Event('neki:shutter'));
      shutter.classList.remove('is-busy');
      shutter.classList.add('is-used');
      $('span', shutter).textContent = '한 번 더 찍기';
      status.innerHTML = '찍은 네컷은 <a href="#archive">아래 앨범</a>에 넣을 수 있어요';
    };
    if (reduce) { cells.forEach(function (c) { c.classList.remove('is-empty'); }); return done(); }
    var shot = function (i) {
      if (i === cells.length) return done();
      cells.forEach(function (c, k) { c.classList.toggle('is-live', k === i); });
      later(function () {
        bang(flash, 'is-on');
        cells[i].classList.remove('is-empty', 'is-live');
        bang(cells[i], 'is-shot');
        later(function () { shot(i + 1); }, 380);
      }, i ? 260 : 120); // 첫 칸은 카운트가 끝나자마자 찍힌다
    };
    var n = 3;
    (function tickDown() {
      if (!n) return shot(0);
      count.textContent = n--;
      bang(count, 'is-tick');
      later(tickDown, 300);
    })();
  }
  if (shutter) shutter.addEventListener('click', shoot);

  // 6) 필름 띠: 포즈 사진을 이어 붙여 흘린다 (두 번 넣어 끊김 없이)
  var film = $('[data-film]');
  if (film) {
    var all = [];
    CAST_KEYS.forEach(function (k) { POSES[k].sets.forEach(function (s, i) { if (i < 3) all.push(s[0], s[2]); }); });
    // 작은 썸네일(img/film)을 바로 불러온다: 띠는 transform으로 움직여서 lazy 로딩이 빈 칸을 남긴다
    var html = all.map(function (src) { return '<img src="' + src.replace('img/cast/', 'img/film/') + '" alt="" width="68" height="90">'; }).join('');
    film.innerHTML = html + html;
  }

  // 8) 포즈: 오른쪽에서 고르면 폰 속 앱 화면이 반응한다
  //    인원 → 인원 수 바텀시트에서 체크 → 칩·목록 갱신 / 관계 → 2인 자동 선택(개발 전달 노트) / 랜덤 → 랜덤포즈 화면
  var syncPoseStory = null, advancePoseStory = null, setPoseStoryRelation = null;
  var picker = $('[data-picker]');
  var app = $('[data-appose]');
  if (picker && app) {
    var CARD = function (k) { return 'img/cast-card/' + k + '.webp'; };
    var FEED = {
      // 1·3·4인: 캐스트 1장 + 앱 포즈 데이터(dev 어드민, 2x2 네컷만, 브랜드 로고 없는 것)
      '1': ['solo-1', 'solo-3', 'solo-4', 'solo-5', 'solo-6', 'solo-7'],   // solo-5~7·p3-4는 브랜드 로고를 지운 판
      '3': ['p3-1', 'p3-2', 'p3-3', 'p3-4'],
      '4': ['p4-1', 'p4-2', 'p4-3', 'p4-4'],
      '2-friend': ['friend-1', 'friend-2', 'friend-3', 'friend-4', 'friend-5', 'friend-6'],
      '2-some': ['ssum-1', 'ssum-2', 'ssum-3', 'ssum-4', 'ssum-5', 'ssum-6'],
      '2-couple': ['couple-1', 'couple-2', 'couple-3', 'couple-4', 'couple-5', 'couple-6'],
      '2': ['friend-1', 'ssum-2', 'couple-1', 'friend-3', 'ssum-4', 'couple-5']
    };
    var st = { n: '2', r: 'friend' };
    var key = function () { return st.n === '2' && st.r ? '2-' + st.r : st.n; };
    var grid = $('[data-ap-grid]'), count = $('[data-ap-count]');
    var nText = $('[data-chip-n-text]'), randomImg = $('[data-ap-random]'), randomBtn = $('[data-random]');
    var swipe = $('[data-pose-swipe]'), back = $('[data-pose-back]');
    var feedView = $('.ap-feed', app), randomView = $('.ap-random', app);
    var hint = $('[data-pose-hint]'), relations = $('[data-rel]', picker);
    var last = '', change = 0, drag = null, returnFocus = null;
    var names = { friend: '친구', some: '썸', couple: '커플' };
    var describe = function () { return st.n + '명' + (st.r ? ' · ' + names[st.r] : ''); };
    var radio = function (group, btn) { $$('button', group).forEach(function (b) { b.setAttribute('aria-checked', String(b === btn)); }); };
    function resetDrag() {
      drag = null; swipe.classList.remove('is-dragging');
      randomImg.style.removeProperty('transform'); randomImg.style.removeProperty('opacity');
    }
    function listView(focus) {
      change++; resetDrag();
      app.classList.remove('is-random');
      feedView.inert = false; randomView.inert = true;
      randomBtn.textContent = '랜덤 포즈 추천 받기';
      hint.textContent = '폰 안의 포즈를 눌러 직접 골라보세요';
      if (focus && returnFocus && returnFocus.isConnected) returnFocus.focus();
    }
    function paint() {
      listView(false);
      relations.hidden = st.n !== '2';
      $('[data-chip-n]', app).classList.add('is-on');
      nText.textContent = st.n + '인';
      $$('[data-chip-r]', app).forEach(function (c) { c.classList.toggle('is-on', c.dataset.chipR === st.r); });
      var list = FEED[key()];
      grid.classList.remove('is-dealing');
      grid.innerHTML = list.slice(0, 4).map(function (k, i) {
        return '<button class="ap-card" type="button" style="--card-i:' + i + '" data-pose-card="' + k + '" aria-label="' + describe() + ' 포즈 ' + (i + 1) + ' 크게 보기"><img src="' + CARD(k) + '" alt="" width="324" height="486"></button>';
      }).join('');
      void grid.offsetWidth;
      grid.classList.add('is-dealing');
      count.textContent = list.length + '개의 포즈';
      hint.textContent = describe() + ' 포즈예요. 다른 세트도 골라보세요';
      if (syncPoseStory) syncPoseStory((st.r === 'some' ? 'ssum' : st.r || 'friend') + '-1');
    }
    async function showCard(k, direction, source) {
      var mine = ++change;
      resetDrag();
      // Load before moving the current photo away; rapid choices only show the latest result.
      var next = new Image(); next.src = CARD(k);
      try { await next.decode(); } catch (e) {
        if (mine === change) hint.textContent = '사진을 불러오지 못했어요. 다시 골라주세요';
        return;
      }
      if (mine !== change) return;
      var wasOpen = app.classList.contains('is-random');
      if (wasOpen && !reduce) {
        randomImg.style.transform = 'translateX(' + (direction < 0 ? '110%' : '-110%') + ') rotate(' + (direction < 0 ? '8deg' : '-8deg') + ')';
        randomImg.style.opacity = '0';
        await new Promise(function (done) { setTimeout(done, 180); });
        if (mine !== change) return;
      }
      if (!wasOpen) returnFocus = source || randomBtn;
      last = k; randomImg.src = CARD(k);
      if (syncPoseStory) syncPoseStory(k);
      randomImg.alt = describe() + ' 추천 포즈 ' + (FEED[key()].indexOf(k) + 1);
      randomImg.classList.remove('is-entering');
      randomImg.style.removeProperty('transform'); randomImg.style.removeProperty('opacity');
      randomImg.style.setProperty('--pose-enter', direction < 0 ? '-25%' : '25%');
      void randomImg.offsetWidth; randomImg.classList.add('is-entering');
      feedView.inert = true; randomView.inert = false;
      app.classList.add('is-random');
      randomBtn.textContent = '다른 포즈 보기';
      hint.textContent = describe() + ' · ' + (FEED[key()].indexOf(k) + 1) + '/' + FEED[key()].length + ' · 사진을 좌우로 밀어보세요';
      if (!wasOpen && source && source.closest('.ap-feed')) swipe.focus({ preventScroll: true });
    }
    function advance(direction, random) {
      var list = FEED[key()], index = list.indexOf(last), next;
      if (random) {
        var candidates = list.filter(function (k) { return k !== last; });
        next = candidates[Math.floor(Math.random() * candidates.length)] || list[0];
      } else next = list[(index + direction + list.length) % list.length];
      return showCard(next, direction, randomBtn);
    }
    $$('[data-n]', picker).forEach(function (b) {
      b.addEventListener('click', function () {
        st.n = b.dataset.n; if (st.n !== '2') st.r = '';
        radio(b.parentNode, b); radio(relations, $('[data-r="' + st.r + '"]', picker));
        paint();
      });
    });
    $$('[data-r]', picker).forEach(function (b) {
      b.addEventListener('click', function () {
        st.n = '2'; st.r = b.dataset.r;
        radio(b.parentNode, b); radio($('.seg', picker), $('[data-n="2"]', picker)); paint();
      });
    });
    grid.addEventListener('click', function (e) {
      var card = e.target.closest('[data-pose-card]');
      if (card && grid.contains(card)) showCard(card.dataset.poseCard, 1, card);
    });
    randomBtn.addEventListener('click', function () { advance(1, true); });
    back.addEventListener('click', function () { listView(true); });
    swipe.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); advance(e.key === 'ArrowLeft' ? -1 : 1, false); }
    });
    randomView.addEventListener('keydown', function (e) { if (e.key === 'Escape') listView(true); });
    swipe.addEventListener('pointerdown', function (e) {
      if (!e.isPrimary || e.button !== 0) return;
      change++; resetDrag();
      randomImg.classList.remove('is-entering');
      drag = { x: e.clientX, y: e.clientY, dx: 0, id: e.pointerId };
      swipe.setPointerCapture(e.pointerId);
    });
    swipe.addEventListener('pointermove', function (e) {
      if (!drag || drag.id !== e.pointerId) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) { resetDrag(); return; }
      drag.dx = dx;
      swipe.classList.add('is-dragging');
      if (!reduce) {
        randomImg.style.transform = 'translateX(' + dx + 'px) rotate(' + Math.max(-12, Math.min(12, dx / 18)) + 'deg)';
        randomImg.style.opacity = String(Math.max(.35, 1 - Math.abs(dx) / Math.max(1, swipe.clientWidth)));
      }
    });
    swipe.addEventListener('pointerup', function (e) {
      if (!drag || drag.id !== e.pointerId) return;
      var dx = drag.dx; resetDrag();
      if (Math.abs(dx) > Math.max(32, swipe.clientWidth * .18)) advance(dx < 0 ? 1 : -1, false);
    });
    swipe.addEventListener('pointercancel', resetDrag);
    swipe.addEventListener('lostpointercapture', resetDrag);
    randomView.inert = true;
    advancePoseStory = function (direction) { return advance(direction, false); };
    setPoseStoryRelation = function (relationship) {
      st.n = '2'; st.r = relationship;
      radio(relations, $('[data-r="' + relationship + '"]', picker));
      radio($('.seg', picker), $('[data-n="2"]', picker));
      hint.textContent = '2명 · ' + names[relationship] + ' 포즈예요. 다른 세트도 골라보세요';
    };
  }

  // Desktop handoff: the existing pose phone takes over the map phone's screen position.
  // The slot keeps document layout stable; no duplicated interactive phone is created.
  var poseSlot = $('[data-pose-slot]');
  var mapVisual = $('[data-stage="map"]');
  if (poseSlot && app && flow && mapVisual) {
    var handoffPending = false, handoffActive = false;
    function endHandoff() {
      if (!handoffActive) return;
      handoffActive = false;
      app.classList.remove('is-handoff');
      ['left', 'top', 'width', 'height', '--map-cover'].forEach(function (property) { app.style.removeProperty(property); });
      flow.style.removeProperty('opacity');
      root.style.removeProperty('--pose-handoff');
    }
    function handoffFrame() {
      handoffPending = false;
      if (reduce || !wideMQ.matches) return endHandoff();
      var source = flow.getBoundingClientRect(), target = poseSlot.getBoundingClientRect();
      var visualStyle = getComputedStyle(mapVisual);
      var padding = parseFloat(visualStyle.paddingTop) || 0;
      var anchor = (parseFloat(visualStyle.top) || 0) + padding + (mapVisual.clientHeight - padding - source.height) / 2;
      var distance = target.top - source.top;
      if (source.top >= anchor || target.top <= anchor || distance <= 0 || target.top > innerHeight * 3) return endHandoff();
      var progress = Math.max(0, Math.min(1, (anchor - source.top) / distance));
      var eased = progress * progress * (3 - 2 * progress);
      handoffActive = true;
      app.classList.add('is-handoff');
      app.style.left = (source.left + (target.left - source.left) * eased) + 'px';
      app.style.top = anchor + 'px';
      app.style.width = (source.width + (target.width - source.width) * eased) + 'px';
      app.style.height = (source.height + (target.height - source.height) * eased) + 'px';
      app.style.setProperty('--map-cover', String(1 - Math.max(0, Math.min(1, (progress - .18) / .5))));
      root.style.setProperty('--pose-handoff', String(Math.min(1, progress * 3)));
      flow.style.opacity = '0';
    }
    function scheduleHandoff() {
      if (!handoffPending) { handoffPending = true; requestAnimationFrame(handoffFrame); }
    }
    addEventListener('scroll', scheduleHandoff, { passive: true });
    addEventListener('resize', scheduleHandoff);
    wideMQ.addEventListener('change', scheduleHandoff);
    handoffFrame();
  }

  // Pose story: expand the first 2-person set, spread four cuts, then invite a choice.
  var poseStory = $('[data-pose-story]');
  if (poseStory && app && poseSlot) {
    var storyStage = $('.pose-story-stage', poseStory);
    var storyDeck = $('[data-pose-deck]', poseStory);
    var storyCuts = $$('[data-pose-cut]', storyDeck);
    var storyTitle = $('[data-pose-title]', poseStory), storyCaption = $('[data-pose-caption]', poseStory);
    var storyCopy = $('.feature__copy', poseStory);
    var storyPending = false, storyReady = false, storyPhotoTurn = 0, storyTouch = null, storyFrameKey = '';
    var storyManual = false, storyRelationship = '';
    var storyRelationLabels = $$('[data-story-relation]', poseStory);
    var clip = function (n) { return Math.max(0, Math.min(1, n)); };
    var smooth = function (a, b, p) { var t = clip((p - a) / (b - a)); return t * t * (3 - 2 * t); };
    var blend = function (a, b, t) { return a + (b - a) * t; };
    syncPoseStory = async function (set) {
      if (!/^(friend|ssum|couple)-[1-6]$/.test(set)) return;
      var mine = ++storyPhotoTurn;
      var paths = [1, 2, 3, 4].map(function (n) { return 'img/cast/' + set + '-' + n + '.webp'; });
      try {
        await Promise.all(paths.map(function (path) { var photo = new Image(); photo.src = path; return photo.decode(); }));
      } catch (e) { return; }
      if (mine !== storyPhotoTurn) return;
      storyCuts.forEach(function (cut, i) { $('img', cut).src = paths[i]; });
      if (storyReady) { storyManual = true; storyStage.style.setProperty('--relation-scene', '0'); }
    };
    function storyFrame() {
      storyPending = false;
      var bounds = poseStory.getBoundingClientRect();
      var W = storyStage.clientWidth, H = storyStage.clientHeight;
      var p = reduce ? 1 : clip(-bounds.top / Math.max(1, poseStory.offsetHeight - H));
      var frameKey = p.toFixed(5) + '|' + W + '|' + H;
      if (frameKey === storyFrameKey) return;
      storyFrameKey = frameKey;
      var expand = smooth(.04, .22, p), spread = smooth(.23, .39, p), finish = smooth(.80, .96, p);
      var relationship = p < .54 ? 'friend' : p < .71 ? 'couple' : 'some';
      if (reduce) relationship = 'friend';
      if (p < .94) storyManual = false;
      if (!storyManual && relationship !== storyRelationship) {
        storyRelationship = relationship;
        if (setPoseStoryRelation) setPoseStoryRelation(relationship);
      }
      storyStage.style.setProperty('--relation-scene', storyManual || reduce ? '0' : '1');
      storyStage.style.setProperty('--relation-couple', smooth(.50, .58, p).toFixed(3));
      storyStage.style.setProperty('--relation-some', smooth(.67, .75, p).toFixed(3));
      storyStage.style.setProperty('--relation-labels', (smooth(.36, .43, p) * (1 - smooth(.84, .94, p))).toFixed(3));
      storyRelationLabels.forEach(function (label) { label.classList.toggle('is-on', label.dataset.storyRelation === relationship); });
      var heading = smooth(.10, .18, p) * (1 - smooth(.80, .88, p));
      var relationTitles = { friend: '친구랑은, 장난스럽게', couple: '커플이라면, 조금 더 다정하게', some: '썸이라면, 조금씩 가까워지게' };
      var relationCaptions = { friend: '편한 사이에 어울리는 네 컷', couple: '둘만의 분위기를 담는 네 컷', some: '아직은 설레는 우리 사이의 네 컷' };
      storyTitle.textContent = p > .9 ? '우리 사이에 맞는 포즈로' : p < .4 ? '둘이 찍을 포즈, 이렇게 이어져요' : relationTitles[relationship];
      storyCaption.textContent = p < .4 ? '네 컷이 하나의 세트로, 고민할 필요 없이' : relationCaptions[relationship];
      var slot = poseSlot.getBoundingClientRect();
      var stageBounds = storyStage.getBoundingClientRect();
      var unit = Math.max(1, slot.width - 20) / 375;
      var fromW = 75 * unit, fromH = 106 * unit;
      var gridW = Math.min(W * .31, 170, H * .20), gridH = gridW * 4 / 3 + 27;
      var headingBox = $('.pose-story-heading', poseStory).getBoundingClientRect();
      var headingBottom = headingBox.bottom - storyStage.getBoundingClientRect().top;
      var baseY = Math.max(headingBottom + 28, H * .37);
      var rowW = Math.max(40, Math.min((W - 48) / 4.35, 208, (H - baseY - 48 - 27) * .75)), rowH = rowW * 4 / 3 + 27;
      var gap = W < 768 ? 8 : 20;
      var rowTotal = rowW * 4 + gap * 3;
      var finalW = Math.min(W < 1024 ? (W - 64) / 2 : W * .16, 184, H * (W < 1024 ? (H < 780 ? .115 : .13) : .20));
      var finalH = finalW * 4 / 3 + 27;
      var finalCenter = W < 1024 ? W / 2 : slot.left - stageBounds.left + slot.width / 2;
      var finalTop = W < 1024 ? (H < 780 ? 130 : 170) : (H - (finalH * 2 + 12)) / 2;
      storyCuts.forEach(function (cut, i) {
        var col = i % 2, row = Math.floor(i / 2);
        var sx = slot.left - stageBounds.left + 10 + 25 * unit + col * (fromW + 4 * unit);
        var sy = slot.top - stageBounds.top + 10 + 199 * unit + row * (fromH + 4 * unit);
        var gx = W / 2 - gridW - 6 + col * (gridW + 12);
        var gy = Math.max(headingBottom + 24, (H - gridH * 2 - 12) / 2 + 45) + row * (gridH + 12);
        var rx = (W - rowTotal) / 2 + i * (rowW + gap);
        var fx = finalCenter - finalW - 6 + col * (finalW + 12);
        var fy = finalTop + row * (finalH + 12);
        var x = blend(blend(sx, gx, expand), rx, spread);
        var y = blend(blend(sy, gy, expand), baseY, spread);
        var width = blend(blend(fromW, gridW, expand), rowW, spread);
        var height = blend(blend(fromH, gridH, expand), rowH, spread);
        x = blend(x, fx, finish); y = blend(y, fy, finish);
        width = blend(width, finalW, finish); height = blend(height, finalH, finish);
        cut.style.width = width + 'px'; cut.style.height = height + 'px';
        cut.style.transform = 'translate(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px)';
        cut.style.opacity = '1';
        cut.style.zIndex = '1';
      });
      storyStage.style.setProperty('--story-heading', heading.toFixed(3));
      storyStage.style.setProperty('--story-deck', smooth(.04, .10, p).toFixed(3));
      storyStage.style.setProperty('--story-phone', (1 - smooth(.08, .26, p)).toFixed(3));
      storyStage.style.setProperty('--story-retreat', expand.toFixed(3));
      storyStage.style.setProperty('--story-copy', (1 - smooth(.01, .08, p) + smooth(.90, .98, p)).toFixed(3));
      storyReady = p >= .94 || reduce;
      storyStage.classList.toggle('is-presenting', !storyReady);
      storyStage.classList.toggle('is-ready', storyReady);
      picker.inert = !storyReady;
      // Keep the semantic heading readable; only gate the interactive picker.
      storyCopy.inert = false;
      app.inert = p > .06 || reduce;
      storyDeck.tabIndex = storyReady ? 0 : -1;
      storyDeck.setAttribute('aria-hidden', String(p < .08));
    }
    function scheduleStory() {
      if (!storyPending) { storyPending = true; requestAnimationFrame(storyFrame); }
    }
    storyDeck.addEventListener('keydown', function (e) {
      if (!storyReady || !advancePoseStory) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); advancePoseStory(e.key === 'ArrowLeft' ? -1 : 1); }
    });
    storyDeck.addEventListener('pointerdown', function (e) {
      if (!storyReady || !e.isPrimary || e.button !== 0) return;
      storyTouch = { x: e.clientX, y: e.clientY, id: e.pointerId };
      storyDeck.setPointerCapture(e.pointerId);
    });
    storyDeck.addEventListener('pointerup', function (e) {
      if (!storyTouch || storyTouch.id !== e.pointerId) return;
      var dx = e.clientX - storyTouch.x, dy = e.clientY - storyTouch.y; storyTouch = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) && advancePoseStory) advancePoseStory(dx < 0 ? 1 : -1);
    });
    storyDeck.addEventListener('pointercancel', function () { storyTouch = null; });
    addEventListener('scroll', scheduleStory, { passive: true });
    addEventListener('resize', scheduleStory);
    storyFrame();
  }

  // 9) 아카이빙: 스크롤 연출(트랙 진행도 p 0 → 1)
  //    A 흩어진 갤러리 → B 네컷만 한 줄(나머지는 사라짐) → C 한 장의 앨범 카드로 겹침 → D 폰이 올라오고 카드가 즐겨찾기 앨범 칸으로 들어감
  var arch = $('[data-arch]');
  var arcEl = $('[data-arc]');
  function mineHTML() { return mine.photos.map(function (src) { return '<img src="' + src + '" alt="" width="360" height="480">'; }).join(''); }
  function renderMine() {
    if (!arch) return;
    var t = $('[data-mine-tile]', arch);
    t.className = 'gx gx--n gx--mine' + (mine.frame ? ' mystrip--' + mine.frame : '');
    t.innerHTML = '<div class="gx-mini">' + mineHTML() + '</div><b>NEKI</b>';
    $('[data-ar-mine]', arcEl).innerHTML = '<div class="ar-mini">' + mineHTML() + '<b>NEKI</b></div>';
  }
  function resetArchive() { renderMine(); }
  if (arch) {
    renderMine();
    var stage = $('.arch__stage', arch);
    var tilesEl = $$('.gx', arch);
    var nIdx = []; tilesEl.forEach(function (el, i) { if (el.dataset.gx === 'n') nIdx.push(i); });
    var label = $('[data-arch-label]', arch);
    var cap = $('[data-arch-cap]');
    var favEl = $('[data-ar-fav]', arcEl), favCount = $('[data-ar-favcount]', arcEl);
    var favImg = favEl.querySelector('img');
    var CAPS = ['갤러리 어딘가에 흩어져 있던 우리의 네컷', '그중 가장 아끼는 순간들만 골라', '한 장도 잃어버리지 않게 차곡차곡', '네컷의 모든 순간, 네키가 간직할게요'];
    var capI = 0;
    var clamp01 = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
    var sm = function (a, b, v) { var t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
    var mix = function (a, b, t) { return a + (b - a) * t; };
    var ROT = [-9, 6, -3, 9, 0];   // 겹칠 때 기울기(마지막이 맨 위)
    // 맨 위에 올라갈 카드는 '내 네컷'
    var mineI = tilesEl.indexOf($('[data-mine-tile]', arch));
    var order = nIdx.filter(function (i) { return i !== mineI; }).concat([mineI]);
    // 성능: 진행도가 그대로면(화면 밖 포함) 아무것도 안 한다. 즐겨찾기 칸 위치는 폰 크기가 바뀔 때만 잰다.
    var lastKey = '', sizeKey = '', rel = null, lastT = 0;
    function frame() {
      var W = stage.clientWidth, H = stage.clientHeight;
      var r = arch.getBoundingClientRect();
      var p = reduce ? 1 : clamp01(-r.top / Math.max(1, r.height - innerHeight));
      var key = p.toFixed(4) + '|' + W + '|' + H;
      if (key === lastKey) return;
      lastKey = key;
      var narrow = W < 768;
      var headH = $('.arch__head', arch).offsetHeight + 64 + 24;
      var cy = headH + (H - headH) / 2;          // 제목 아래 영역의 가운데
      // A: 갤러리 격자
      var cols = narrow ? 4 : 6, rows = Math.ceil(tilesEl.length / cols);
      var T = Math.min(narrow ? (W - 80) / cols : 130, (H - headH - 120) / rows - 8);   // 폰: 가장자리·하단 고정 바와 겹치지 않게
      var gap = 8;
      // B: 한 줄(네컷만)
      var cw = Math.min(narrow ? (W - 40 - 4 * 8) / 5 : 150, (H - headH) * 0.33);
      var chh = cw * 1.5;
      // D: 폰 위치(아래에서 올라온다)
      var ph = Math.min(H - headH - 24, narrow ? W * 1.5 : 640);
      var pw = ph * 750 / 1624;
      var b = sm(0.16, 0.40, p), c = sm(0.46, 0.64, p), d = sm(0.72, 0.93, p);
      var phoneY = mix(H + 40, cy - ph / 2, d);
      var sk = pw + 'x' + ph;
      if (sk !== sizeKey) {
        sizeKey = sk;
        arcEl.style.width = pw + 'px'; arcEl.style.height = ph + 'px';
        var ar = arcEl.getBoundingClientRect(), f0 = favEl.getBoundingClientRect();
        rel = { x: f0.left - ar.left, y: f0.top - ar.top, w: f0.width, h: f0.height };
      }
      arcEl.style.transform = 'translate(' + (-pw / 2) + 'px,' + phoneY + 'px)';
      arcEl.style.opacity = d > 0 ? 1 : 0;
      // 즐겨찾기 앨범 칸의 위치 = 폰 위치(계산값) + 폰 안의 칸 위치(rel). 매 프레임 다시 재지 않는다.
      var fr = { width: rel.w, height: rel.h };
      var tx = -pw / 2 + rel.x + rel.w / 2, ty = phoneY + rel.y + rel.h / 2 - H / 2;
      var tChanged = T !== lastT; lastT = T;
      tilesEl.forEach(function (el, i) {
        var col = i % cols, row = Math.floor(i / cols);
        var ax = (col - (cols - 1) / 2) * (T + gap), ay = cy - H / 2 + (row - (rows - 1) / 2) * (T + gap);
        // 흩어진 느낌: 칸마다 조금씩 어긋나고 기울어져 있다가, 모이기 시작하면 바로 선다
        var jit = ((i * 37) % 11 - 5) / 5, jit2 = ((i * 53) % 9 - 4) / 4;
        var jf = narrow ? 0.5 : 1; ax += jit * T * 0.12 * jf; ay += jit2 * T * 0.1 * jf;
        var x, y, w, h, rot = jit * 4 * (1 - b), op = 1, z = 1;
        if (el.dataset.gx !== 'n') {
          // 사라지는 사진: 크기는 그대로 두고 scale로만 줄인다(배치 재계산 없음)
          x = ax * (1 + 0.15 * b); y = ay * (1 + 0.15 * b); op = 1 - b;
          if (tChanged) { el.style.width = T + 'px'; el.style.height = T + 'px'; }
          el.style.transform = 'translate(' + (x - T / 2) + 'px,' + (y - T / 2) + 'px) rotate(' + rot + 'deg) scale(' + (1 - 0.25 * b) + ')';
          el.style.opacity = op; el.style.visibility = op > 0 ? '' : 'hidden';
          return;
        } else {
          var k = order.indexOf(i), n = order.length;
          var bx = (k - (n - 1) / 2) * (cw + (narrow ? 8 : 18)), by = cy - H / 2;
          x = mix(ax, bx, b); y = mix(ay, by, b);
          w = mix(T, cw, b); h = mix(T, chh, b);
          x = mix(x, 0, c); y = mix(y, by, c); rot = mix(rot, ROT[k % ROT.length], c);
          w = mix(w, cw * 1.25, c); h = mix(h, chh * 1.25, c);
          x = mix(x, tx, d); y = mix(y, ty, d); w = mix(w, fr.width, d); h = mix(h, fr.height, d); rot = mix(rot, 0, d);
          op = 1 - sm(0.93, 0.98, p); z = 10 + k;
        }
        el.style.width = w + 'px'; el.style.height = h + 'px';
        el.style.transform = 'translate(' + (x - w / 2) + 'px,' + (y - h / 2) + 'px) rotate(' + rot + 'deg)';
        el.style.opacity = op; el.style.zIndex = z;
      });
      // 앨범 라벨: 겹친 카드 맨 위 아래쪽에 붙는다
      var top = tilesEl[mineI];
      var lw = cw * 1.25;
      var lx = mix(0, tx, d) - lw / 2 + W / 2, ly = mix(cy - H / 2, ty, d) + mix(chh * 1.25, fr.height, d) / 2 - 64 + H / 2;
      label.style.width = lw + 'px';
      label.style.transform = 'translate(' + lx + 'px,' + ly + 'px) scale(' + mix(1, fr.width / lw, d) + ')';
      label.style.transformOrigin = '0 100%';
      label.style.opacity = sm(0.58, 0.66, p) * (1 - sm(0.86, 0.93, p));
      // 폰에 다 들어가면: 즐겨찾기 13장, 표지는 내 네컷, 최근 사진 맨 앞에 내 네컷
      var done = p > 0.92;
      arcEl.classList.toggle('has-mine', done);
      favCount.textContent = done ? '13장' : '12장';
      if (done && !favEl.querySelector('.ar-mini')) { favImg.style.display = 'none'; favEl.insertAdjacentHTML('afterbegin', '<div class="ar-mini">' + mineHTML() + '</div>'); }
      if (!done && favEl.querySelector('.ar-mini')) { favEl.querySelector('.ar-mini').remove(); favImg.style.display = ''; }
      var ci = p < 0.2 ? 0 : p < 0.46 ? 1 : p < 0.72 ? 2 : 3;
      if (ci !== capI) { capI = ci; cap.classList.add('is-swap'); setTimeout(function () { cap.textContent = CAPS[ci]; cap.classList.remove('is-swap'); }, reduce ? 0 : 200); }
    }
    var archTick = false;
    var req = function () { if (!archTick) { archTick = true; requestAnimationFrame(function () { archTick = false; frame(); }); } };
    addEventListener('scroll', req, { passive: true });
    addEventListener('resize', req);
    frame();
    if (reduce) { cap.textContent = CAPS[3]; }
  }

  // 10) 모바일 하단 고정 바: 히어로 배지가 사라지면 보이고, 다운로드 섹션에서는 숨는다
  var sticky = $('.sticky-cta');
  var heroStores = $('.hero__stores');
  var dl = $('#download');
  if (sticky && heroStores && io) {
    var heroVis = true, dlVis = false;
    var upd = function () {
      var on = !heroVis && !dlVis;
      sticky.classList.toggle('is-visible', on);
      sticky.setAttribute('aria-hidden', on ? 'false' : 'true');
      $('a', sticky).tabIndex = on ? 0 : -1;
    };
    new IntersectionObserver(function (es) { heroVis = es[0].isIntersecting; upd(); }).observe(heroStores);
    new IntersectionObserver(function (es) { dlVis = es[0].isIntersecting; upd(); }, { threshold: .2 }).observe(dl);
  }
})();
