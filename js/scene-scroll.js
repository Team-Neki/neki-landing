/* Gentle proximity stops. Native wheel/touch input is never prevented. */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  var wide = matchMedia('(min-width: 1024px)');
  var idleTimer = null, animation = null, intent = false, touching = false, lastTarget = null;
  var idleMs = 180, inputY = 0;
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function pageTop(el) { return el.getBoundingClientRect().top + scrollY; }
  function trackPoints(selector, progress) {
    var el = document.querySelector(selector);
    if (!el) return null;
    var start = pageTop(el), travel = Math.max(0, el.offsetHeight - innerHeight);
    return { start: start, end: start + travel, points: progress.map(function (p) { return start + travel * p; }) };
  }
  function candidates() {
    var groups = [
      trackPoints('[data-pose-story]', [.43, .62, .78, .99]),
      trackPoints('[data-arch]', [0, .42, .67, .99])
    ];
    var map = document.querySelector('#map');
    var steps = map ? Array.prototype.slice.call(map.querySelectorAll('[data-steps] li')) : [];
    if (wide.matches && steps.length === 3) {
      var first = pageTop(steps[0]), last = pageTop(steps[2]);
      groups.push({ start: pageTop(map), end: pageTop(map) + map.offsetHeight - innerHeight * .4, points: [
        first - innerHeight * .8,
        first - innerHeight * .7 + .80 * (steps[0].offsetHeight + innerHeight * .2 - 100),
        pageTop(steps[1]) - innerHeight * .35,
        last - innerHeight * .5 + steps[2].offsetHeight * .65
      ] });
    }
    var max = Math.max(0, root.scrollHeight - innerHeight);
    var points = [];
    groups.forEach(function (group) {
      if (!group || scrollY < group.start || scrollY > group.end + 2) return;
      group.points.forEach(function (y) { points.push(clamp(y, 0, max)); });
    });
    return points;
  }
  function cancel() {
    clearTimeout(idleTimer); idleTimer = null;
    if (animation !== null) cancelAnimationFrame(animation);
    animation = null;
    root.classList.remove('is-scene-snapping');
  }
  function settle() {
    idleTimer = null;
    if (!intent || touching || reduce.matches || document.hidden) return;
    intent = false;
    if (Math.abs(scrollY - inputY) < 4) return;
    var radius = Math.min(180, innerHeight * .18), from = scrollY;
    var target = candidates().reduce(function (best, y) {
      return best === null || Math.abs(y - from) < Math.abs(best - from) ? y : best;
    }, null);
    if (target === null || Math.abs(target - from) < 3 || Math.abs(target - from) > radius) return;
    // Do not pull back to the same stop again while the user is leaving it.
    if (lastTarget !== null && Math.abs(target - lastTarget) < 3) return;
    lastTarget = target;
    var duration = clamp(Math.abs(target - from) * 1.5, 180, 300), started = performance.now();
    root.classList.add('is-scene-snapping');
    function frame(now) {
      var t = clamp((now - started) / duration, 0, 1);
      var eased = 1 - Math.pow(1 - t, 3);
      scrollTo({ top: from + (target - from) * eased, behavior: 'instant' });
      if (t < 1) animation = requestAnimationFrame(frame);
      else { animation = null; root.classList.remove('is-scene-snapping'); }
    }
    animation = requestAnimationFrame(frame);
  }
  function schedule() {
    if (animation !== null || !intent || touching) return;
    if (lastTarget !== null && Math.abs(scrollY - lastTarget) > Math.min(180, innerHeight * .18) * 1.5) lastTarget = null;
    clearTimeout(idleTimer); idleTimer = setTimeout(settle, idleMs);
  }
  function userInput() { cancel(); if (!intent) inputY = scrollY; intent = true; schedule(); }
  addEventListener('wheel', function (e) {
    if (e.ctrlKey || e.metaKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    userInput();
  }, { passive: true });
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('touchstart', function () { cancel(); inputY = scrollY; touching = true; intent = true; }, { passive: true });
  addEventListener('touchend', function () { touching = false; schedule(); }, { passive: true });
  addEventListener('touchcancel', function () { touching = false; intent = false; cancel(); }, { passive: true });
  addEventListener('pointerdown', function (e) { if (e.pointerType !== 'touch') { cancel(); intent = false; } }, { passive: true });
  addEventListener('keydown', function (e) {
    var el = e.target;
    if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(el.tagName))) { cancel(); intent = false; return; }
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].indexOf(e.key) !== -1 && !e.ctrlKey && !e.metaKey && !e.altKey) userInput();
    else { cancel(); intent = false; }
  });
  addEventListener('resize', function () { cancel(); intent = false; lastTarget = null; });
  addEventListener('hashchange', function () { cancel(); intent = false; lastTarget = null; });
  reduce.addEventListener('change', function () { cancel(); intent = false; });
  document.addEventListener('visibilitychange', function () { if (document.hidden) { cancel(); intent = false; } });
})();
