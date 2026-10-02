// Each .video-slot names a file in static/videos/. If the file exists it plays
// as a muted, looping autoplay video; otherwise a labeled placeholder is shown,
// so new videos only need to be dropped into static/videos/ with the right name.
//
// Slots that share a data-sync value form a pair (e.g. CAPEX vs. human from the
// same start). A pair restarts together whenever it scrolls into view; a clip
// that finishes first holds its last frame under its data-end label ("Done" by
// default) until the other finishes, then both restart together.
var SYNC_HOLD_MS = 1500;  // how long a finished pair rests on its last frames

document.addEventListener('DOMContentLoaded', function () {
  var groups = {};

  document.querySelectorAll('.video-slot').forEach(function (slot) {
    var file = slot.dataset.video;
    var label = slot.dataset.label || file;
    var sync = slot.dataset.sync;

    var video = document.createElement('video');
    video.muted = true;
    video.loop = !sync;
    video.autoplay = !sync;
    video.playsInline = true;
    video.preload = sync ? 'auto' : 'metadata';
    video.setAttribute('aria-label', label);

    var source = document.createElement('source');
    source.src = './static/videos/' + file;
    source.type = 'video/mp4';
    source.addEventListener('error', function () { showPlaceholder(slot, file, label); });
    video.appendChild(source);
    slot.appendChild(video);

    if (slot.dataset.tag) {
      var tag = document.createElement('span');
      tag.className = 'video-tag ' + (slot.dataset.tagClass || '');
      tag.textContent = slot.dataset.tag;
      slot.appendChild(tag);
    }

    // Playback speed of sped-up clips, e.g. data-speed="3×".
    if (slot.dataset.speed) {
      var speed = document.createElement('span');
      speed.className = 'video-speed';
      speed.textContent = slot.dataset.speed;
      slot.appendChild(speed);
    }

    if (sync) {
      var end = document.createElement('span');
      end.className = 'video-end ' + (slot.dataset.endClass || '');
      end.textContent = slot.dataset.end || 'Done';
      slot.appendChild(end);
      (groups[sync] = groups[sync] || []).push(video);
    }
  });

  Object.keys(groups).forEach(function (name) { syncGroup(groups[name]); });

  // Only play videos that are on screen (pairs are handled by syncGroup).
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var v = entry.target;
        if (entry.isIntersecting) { v.play().catch(function () {}); } else { v.pause(); }
      });
    }, { threshold: 0.25 });
    document.querySelectorAll('.video-slot:not([data-sync]) video').forEach(function (v) { observer.observe(v); });
  }
});

function syncGroup(videos) {
  var visible = [];
  var shown = false;
  var run = 0;  // bumped on every start or stop, so callbacks from an older run do nothing
  var timer = null;

  // A clip whose file failed to load was replaced by a placeholder; don't wait for it.
  function done(v) { return v.ended || !document.body.contains(v); }

  function playAll(mine) {
    if (mine !== run) return;
    videos.forEach(function (v) {
      if (document.body.contains(v)) v.play().catch(function () {});
    });
  }

  function start() {
    var mine = ++run;
    clearTimeout(timer);
    var waiting = 0;
    videos.forEach(function (v) {
      v.pause();
      if (v.parentNode) v.parentNode.classList.remove('is-ended');
      try { v.currentTime = 0; } catch (e) {}
    });
    // Start only once every clip can play, so the pair really begins together.
    videos.forEach(function (v) {
      if (v.readyState >= 3 || !document.body.contains(v)) return;
      waiting += 1;
      v.addEventListener('canplay', function ready() {
        v.removeEventListener('canplay', ready);
        if (--waiting === 0) playAll(mine);
      });
    });
    if (waiting === 0) playAll(mine);
  }

  function stop() {
    ++run;
    clearTimeout(timer);
    videos.forEach(function (v) { v.pause(); });
  }

  videos.forEach(function (v) {
    v.addEventListener('ended', function () {
      v.parentNode.classList.add('is-ended');
      if (videos.every(done)) {
        var mine = run;
        timer = setTimeout(function () { if (mine === run) start(); }, SYNC_HOLD_MS);
      }
    });
  });

  if (!('IntersectionObserver' in window)) { shown = true; start(); return; }
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) { visible[videos.indexOf(entry.target)] = entry.isIntersecting; });
    var now = visible.some(function (x) { return x; });
    if (now && !shown) { shown = true; start(); }
    else if (!now && shown) { shown = false; stop(); }
  }, { threshold: 0.25 });
  videos.forEach(function (v) { observer.observe(v); });
}

function showPlaceholder(slot, file, label) {
  var tag = slot.querySelector('.video-tag');
  slot.classList.add('is-missing');
  slot.innerHTML =
    '<div class="ph-inner">' +
      '<div class="ph-icon"><i class="fas fa-film"></i></div>' +
      '<div class="ph-label"></div>' +
      '<div><code></code></div>' +
    '</div>';
  slot.querySelector('.ph-label').textContent = 'Video coming soon: ' + label;
  slot.querySelector('code').textContent = 'static/videos/' + file;
  if (tag) slot.appendChild(tag);
}
