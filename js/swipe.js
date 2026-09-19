(function() {
  var prev = window.SWIPE_PREV || '';
  var next = window.SWIPE_NEXT || '';
  if (!prev && !next) return;
  var sx = 0, sy = 0;
  document.addEventListener('touchstart', function(e) {
    sx = e.touches[0].clientX;
    sy = e.touches[0].clientY;
  }, { passive: true });
  document.addEventListener('touchend', function(e) {
    var dx = e.changedTouches[0].clientX - sx;
    var dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      if (dx < 0 && next) window.location.href = next;
      else if (dx > 0 && prev) window.location.href = prev;
    }
  }, { passive: true });
})();
