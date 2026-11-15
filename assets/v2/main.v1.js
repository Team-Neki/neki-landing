/* NEKI 랜딩: 3D 무대 밖의 가벼운 동작
   1) OS에 맞는 스토어 연결  2) 헤더 배경·진행 막대  3) 섹션 등장  4) 공감 말풍선 입력 효과
   5) 포즈 덱 넘기기  6) 모바일 하단 고정 바  7) 히어로 셔터 플래시(3D가 꺼져도 동작) */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var STORE = {
    ios: 'https://apps.apple.com/kr/app/id6757490609',
    android: 'https://play.google.com/store/apps/details?id=com.neki.android'
  };

  // 1) 단일 다운로드 버튼은 방문자 OS의 스토어로. 데스크톱이면 #download로 둔다.
  var ua = navigator.userAgent;
  var os = /android/i.test(ua) ? 'android' : /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) ? 'ios' : null;
  if (os) {
    document.querySelectorAll('[data-store]').forEach(function (a) { a.href = STORE[os]; });
    document.querySelectorAll('.stores').forEach(function (box) {
      var mine = box.querySelector('[data-os="' + os + '"]');
      if (mine) box.prepend(mine);
    });
  }

  // 2) 헤더 배경 + 진행 막대
  var header = document.querySelector('[data-header]');
  var tick = false;
  function onScroll() {
    tick = false;
    var max = Math.max(1, root.scrollHeight - innerHeight);
    header.classList.toggle('is-scrolled', scrollY > 8);
    header.style.setProperty('--k', Math.min(1, scrollY / max).toFixed(4));
  }
  addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  var io = 'IntersectionObserver' in window;

  // 3) 섹션 등장
  var reveals = document.querySelectorAll('.reveal');
  if (!io || reduce) reveals.forEach(function (el) { el.classList.add('is-in'); });
  else {
    var ro = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); ro.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -10% 0px' });
    reveals.forEach(function (el) { ro.observe(el); });
  }

  // 4) 공감 말풍선: 차례로 올라오고, 점 세 개 → 문장
  var chats = document.querySelectorAll('.chat__item');
  if (!io || reduce) chats.forEach(function (el) { el.classList.add('is-in', 'is-typed'); });
  else {
    var co = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        co.unobserve(e.target);
        var i = Array.prototype.indexOf.call(chats, e.target);
        setTimeout(function () { e.target.classList.add('is-in'); }, i * 150);
        setTimeout(function () { e.target.classList.add('is-typed'); }, i * 150 + 1400);
      });
    }, { rootMargin: '0px 0px -15% 0px' });
    chats.forEach(function (el) { co.observe(el); });
  }

  // 4-1) 지도 단계: 화면 가운데를 지나는 단계를 켠다
  var steps = document.querySelectorAll('.steps li');
  if (io) {
    var so = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { steps.forEach(function (s) { s.classList.toggle('is-on', s === e.target); }); } });
    }, { rootMargin: '-45% 0px -45% 0px' });
    steps.forEach(function (s) { so.observe(s); });
    if (steps[0]) steps[0].classList.add('is-on');
  }

  // 4-2) 헤더 메뉴: 지금 보는 섹션 표시
  var navs = document.querySelectorAll('.header__nav a');
  if (io && navs.length) {
    var no = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        navs.forEach(function (a) { a.classList.toggle('is-on', a.getAttribute('href') === '#' + e.target.id); });
      });
    }, { rootMargin: '-50% 0px -50% 0px' });
    navs.forEach(function (a) { var s = document.querySelector(a.getAttribute('href')); if (s) no.observe(s); });
  }

  // 5) 포즈 덱: 클릭 또는 3초마다 앞 카드가 넘어가고 다음 세트가 온다
  var deck = document.querySelector('[data-deck]');
  if (deck) {
    var cards = Array.prototype.slice.call(deck.children);
    var order = cards.slice();
    var place = function () { order.forEach(function (c, i) { c.dataset.pos = i; }); };
    place();
    var busy = false;
    var next = function () {
      if (busy) return; busy = true;
      var front = order[0];
      front.classList.add('is-flip');
      setTimeout(function () {
        order.push(order.shift());
        front.classList.remove('is-flip');
        place(); busy = false;
      }, reduce ? 0 : 650);
    };
    deck.addEventListener('click', next);
    if (!reduce && io) {
      var timer = null;
      new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { if (!timer) timer = setInterval(next, 3000); }
        else { clearInterval(timer); timer = null; }
      }).observe(deck);
    }
  }

  // 6) 모바일 하단 고정 바: 히어로 배지가 사라지면 보이고, 다운로드 섹션에서는 숨는다
  var sticky = document.querySelector('.sticky-cta');
  var heroStores = document.querySelector('.hero__stores');
  var dl = document.querySelector('#download');
  if (sticky && heroStores && io) {
    var heroVis = true, dlVis = false;
    var upd = function () {
      var show = !heroVis && !dlVis;
      sticky.classList.toggle('is-visible', show);
      sticky.setAttribute('aria-hidden', show ? 'false' : 'true');
      sticky.querySelector('a').tabIndex = show ? 0 : -1;
    };
    new IntersectionObserver(function (es) { heroVis = es[0].isIntersecting; upd(); }).observe(heroStores);
    new IntersectionObserver(function (es) { dlVis = es[0].isIntersecting; upd(); }, { threshold: .2 }).observe(dl);
  }

  // 7) 히어로 셔터 플래시: 7초마다 "찰칵". 3D 무대는 'neki:shutter' 이벤트를 듣는다.
  var flash = document.querySelector('.hero .flash');
  if (flash && !reduce) {
    setInterval(function () {
      if (document.hidden || scrollY > innerHeight) return;
      flash.classList.remove('is-on'); void flash.offsetWidth; flash.classList.add('is-on');
      dispatchEvent(new Event('neki:shutter'));
    }, 7000);
  }
})();
