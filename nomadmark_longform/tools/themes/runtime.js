(function () {
  var TOTAL = __TOTAL__;
  var root = document.getElementById('main');
  var clips = [].slice.call(root.querySelectorAll('.clip')).filter(function (c) { return c.tagName !== 'AUDIO'; });
  var audio = document.getElementById('narr');

  // 시간 t(초)로 화면 상태를 정확히 맞춘다. 모든 애니메이션은 CSS라서 프레임 단위 seek가 결정적이다.
  function seek(t) {
    for (var i = 0; i < clips.length; i++) {
      var c = clips[i], s = +c.dataset.start, d = +c.dataset.duration;
      c.style.visibility = t >= s && t < s + d ? 'visible' : 'hidden';
    }
    var anims = document.getAnimations();
    for (var j = 0; j < anims.length; j++) { anims[j].pause(); anims[j].currentTime = t * 1000; }
  }
  window.__hfSeek = seek;
  window.__hfDuration = TOTAL;

  // HyperFrames 렌더러용: 일시정지된 GSAP 타임라인을 등록하고, 그 시간에 맞춰 CSS 애니메이션을 seek
  if (window.gsap) {
    var st = { t: 0 };
    var tl = gsap.timeline({ paused: true });
    tl.to(st, { t: TOTAL, duration: TOTAL, ease: 'none', onUpdate: function () { seek(st.t); } });
    window.__timelines = window.__timelines || {};
    window.__timelines.main = tl;
  }
  seek(0);

  // 브라우저에서 index.html을 직접 열었을 때: 화면 맞춤 + 클릭하면 재생(스페이스: 일시정지)
  if (/render/.test(location.search) || navigator.webdriver) return;
  function fit() {
    var k = Math.min(innerWidth / 1920, innerHeight / 1080);
    root.style.transform = 'scale(' + k + ')';
    root.style.transformOrigin = '0 0';
    document.body.style.overflow = 'hidden';
  }
  fit(); addEventListener('resize', fit);
  var playing = false, t0 = 0, base = 0;
  function now() { return audio && !audio.paused ? audio.currentTime : base + (playing ? (performance.now() - t0) / 1000 : 0); }
  function loop() { if (!playing) return; var t = now(); seek(t); if (t < TOTAL) requestAnimationFrame(loop); }
  function toggle() {
    if (playing) { base = now(); playing = false; if (audio) audio.pause(); return; }
    playing = true; t0 = performance.now();
    if (audio) { audio.currentTime = base; audio.play(); }
    requestAnimationFrame(loop);
  }
  addEventListener('click', toggle);
  addEventListener('keydown', function (e) { if (e.code === 'Space') { e.preventDefault(); toggle(); } });
})();
