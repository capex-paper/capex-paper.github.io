// Each .video-slot names a file in static/videos/. If the file exists it plays
// as a muted, looping autoplay video; otherwise a labeled placeholder is shown,
// so new videos only need to be dropped into static/videos/ with the right name.
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.video-slot').forEach(function (slot) {
    var file = slot.dataset.video;
    var label = slot.dataset.label || file;

    var video = document.createElement('video');
    video.muted = true;
    video.loop = true;
    video.autoplay = true;
    video.playsInline = true;
    video.preload = 'metadata';
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
  });

  // Only play videos that are on screen.
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var v = entry.target;
        if (entry.isIntersecting) { v.play().catch(function () {}); } else { v.pause(); }
      });
    }, { threshold: 0.25 });
    document.querySelectorAll('.video-slot video').forEach(function (v) { observer.observe(v); });
  }
});

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
