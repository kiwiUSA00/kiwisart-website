// Room preview — sample room, or the visitor's own wall photo.
// Sample photo: images/room-bg.jpg (1720×1290, front-on accent wall).
// Own-wall photos are read locally with an object URL and never leave the device.

var ROOM_SCALES = { small: 0.38, medium: 0.62, large: 0.90 };
var curScale = 'medium';
var rCanvas = null, rCtx = null, rImg = null, roomBgImg = null;

// Own-wall state
var wallMode = false, wallImg = null, wallUrl = null;
var artCX = null, artCY = null;     // painting centre, canvas px
var wallSizePct = 35;               // painting width as % of photo width (when wall width unknown)
var wallWidthFt = null;             // real width of wall shown in photo, if given
var PAINT_W_IN = null;              // painting's real width, read from the page

(function () {
  var bg = new Image();
  bg.onload = function () { roomBgImg = bg; if (rCtx && !wallMode) drawRoom(); };
  bg.src = '/images/room-bg.jpg';
})();

// ── Sample room geometry (860×537 canvas) ────────────────────────────────────
var PHOTO_W = 1720, PHOTO_H = 1290;
var CANVAS_W = 860, CANVAS_H = 537;
var PHOTO_SCALE = CANVAS_W / PHOTO_W;
var PHOTO_DY    = (CANVAS_H - PHOTO_H * PHOTO_SCALE) / 2;
var WALL_LEFT = 40, WALL_RIGHT = 820, WALL_TOP = 15, SOFA_Y = 240, HANG_CY = 130;

function readPaintingWidth() {
  var el = document.querySelector('.art-dims');
  if (!el) return null;
  var FR = { '½': 0.5, '¼': 0.25, '¾': 0.75 };
  var m = /([\d]+)\s*([¼½¾]?)/.exec(el.textContent);
  return m ? parseInt(m[1], 10) + (FR[m[2]] || 0) : null;
}

function artAspect() {
  return (rImg && rImg.naturalWidth) ? rImg.naturalWidth / rImg.naturalHeight : 1.5;
}

// Framed painting with shadow and a little glare
function drawArt(ctx, left, top, pw, ph, strength) {
  var s = strength || 1;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,' + (0.55 * s) + ')';
  ctx.shadowBlur = 20 * s; ctx.shadowOffsetX = 3 * s; ctx.shadowOffsetY = 7 * s;
  ctx.fillStyle = '#080808';
  ctx.fillRect(left - 3, top - 3, pw + 6, ph + 6);
  ctx.restore();
  ctx.fillStyle = 'rgba(25,18,8,0.70)';
  ctx.fillRect(left - 3, top - 3, pw + 6, ph + 6);
  ctx.drawImage(rImg, left, top, pw, ph);
  ctx.save();
  var g = ctx.createLinearGradient(left, top, left + pw, top + ph);
  g.addColorStop(0, 'rgba(255,255,255,0.09)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.02)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(left, top, pw, ph);
  ctx.restore();
}

// ── Draw ─────────────────────────────────────────────────────────────────────
function drawRoom() {
  if (!rCtx) return;
  if (wallMode) return drawWall();
  var ctx = rCtx;
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  if (roomBgImg && roomBgImg.naturalWidth > 0) {
    ctx.drawImage(roomBgImg, 0, 0, PHOTO_W, PHOTO_H, 0, PHOTO_DY, CANVAS_W, PHOTO_H * PHOTO_SCALE);
  } else {
    ctx.fillStyle = '#5a5e6a'; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }
  if (rImg && rImg.naturalWidth > 0) {
    var sc = ROOM_SCALES[curScale] || 0.62;
    var maxW = (WALL_RIGHT - WALL_LEFT) * sc, maxH = (SOFA_Y - WALL_TOP) * sc;
    var a = artAspect(), pw, ph;
    if (maxW / maxH > a) { ph = maxH; pw = ph * a; } else { pw = maxW; ph = pw / a; }
    var cx = (WALL_LEFT + WALL_RIGHT) / 2;
    var cy = curScale === 'large' ? SOFA_Y - 15 - ph / 2 : HANG_CY;
    drawArt(ctx, Math.round(cx - pw / 2), Math.round(cy - ph / 2), Math.round(pw), Math.round(ph));
  }
  var vig = ctx.createRadialGradient(CANVAS_W * 0.5, CANVAS_H * 0.45, CANVAS_H * 0.2, CANVAS_W * 0.5, CANVAS_H * 0.45, CANVAS_H * 0.82);
  vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = vig; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
}

function wallArtSize() {
  var W = rCanvas.width, pw;
  if (wallWidthFt && PAINT_W_IN) pw = W * PAINT_W_IN / (wallWidthFt * 12);
  else pw = W * wallSizePct / 100;
  return [pw, pw / artAspect()];
}

function drawWall() {
  var ctx = rCtx, W = rCanvas.width, H = rCanvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(wallImg, 0, 0, W, H);
  if (!(rImg && rImg.naturalWidth > 0)) return;
  var sz = wallArtSize(), pw = sz[0], ph = sz[1];
  if (artCX === null) { artCX = W / 2; artCY = H * 0.4; }
  // keep at least part of the painting on screen
  artCX = Math.min(Math.max(artCX, -pw / 2 + 20), W + pw / 2 - 20);
  artCY = Math.min(Math.max(artCY, -ph / 2 + 20), H + ph / 2 - 20);
  drawArt(ctx, Math.round(artCX - pw / 2), Math.round(artCY - ph / 2), Math.round(pw), Math.round(ph), Math.max(0.6, W / 1400));
}

// ── Own-wall controls ────────────────────────────────────────────────────────
function buildWallControls() {
  var ctrls = document.querySelector('#room-overlay .room-ctrls');
  if (!ctrls || document.getElementById('wall-upload')) return;

  var own = document.createElement('div');
  own.className = 'room-ctrl';
  own.innerHTML =
    '<div class="room-ctrl-label">Your Wall</div>' +
    '<div class="room-ctrl-btns">' +
      '<label class="rcb rcb-upload" for="wall-upload">' +
        '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>' +
        '<span id="wall-upload-text">Try it on my wall</span></label>' +
      '<input type="file" id="wall-upload" accept="image/*" hidden>' +
      '<button type="button" class="rcb" id="wall-sample" hidden>Sample room</button>' +
    '</div>';
  ctrls.appendChild(own);

  var tools = document.createElement('div');
  tools.className = 'wall-tools';
  tools.id = 'wall-tools';
  tools.hidden = true;
  tools.innerHTML =
    '<div class="wall-tool" id="wall-size-tool">' +
      '<label for="wall-size">Painting size</label>' +
      '<input type="range" id="wall-size" min="8" max="95" value="' + wallSizePct + '">' +
    '</div>' +
    '<div class="wall-tool"' + (PAINT_W_IN ? '' : ' hidden') + '>' +
      '<label for="wall-width">Wall width in photo <span class="wall-opt">(optional, for true scale)</span></label>' +
      '<span class="wall-width-row"><input type="number" id="wall-width" min="1" max="200" step="0.5" inputmode="decimal" placeholder="e.g. 12"> ft</span>' +
    '</div>' +
    '<p class="wall-hint" id="wall-hint">Drag the painting to position it. Your photo stays on your device and is never uploaded.</p>';
  ctrls.parentNode.insertBefore(tools, ctrls.nextSibling);

  document.getElementById('wall-upload').addEventListener('change', function (e) {
    var f = e.target.files && e.target.files[0];
    if (f) loadWallPhoto(f);
    e.target.value = '';
  });
  document.getElementById('wall-sample').addEventListener('click', exitWallMode);
  document.getElementById('wall-size').addEventListener('input', function (e) {
    wallSizePct = +e.target.value; drawRoom();
  });
  document.getElementById('wall-width').addEventListener('input', function (e) {
    var v = parseFloat(e.target.value);
    wallWidthFt = v > 0 ? v : null;
    document.getElementById('wall-size-tool').classList.toggle('is-off', !!wallWidthFt);
    document.getElementById('wall-size').disabled = !!wallWidthFt;
    updateHint();
    drawRoom();
  });

  // Drag to move
  var drag = null;
  rCanvas.addEventListener('pointerdown', function (e) {
    if (!wallMode) return;
    var r = rCanvas.getBoundingClientRect();
    drag = { x: e.clientX, y: e.clientY, cx: artCX, cy: artCY, k: rCanvas.width / r.width };
    rCanvas.setPointerCapture(e.pointerId);
    rCanvas.classList.add('dragging');
  });
  rCanvas.addEventListener('pointermove', function (e) {
    if (!drag) return;
    artCX = drag.cx + (e.clientX - drag.x) * drag.k;
    artCY = drag.cy + (e.clientY - drag.y) * drag.k;
    drawRoom();
  });
  function endDrag() { drag = null; rCanvas.classList.remove('dragging'); }
  rCanvas.addEventListener('pointerup', endDrag);
  rCanvas.addEventListener('pointercancel', endDrag);
}

function updateHint() {
  var h = document.getElementById('wall-hint');
  if (!h) return;
  var dims = document.querySelector('.art-dims');
  h.textContent = wallWidthFt && dims
    ? 'Shown at actual size (' + dims.textContent.trim() + ') on a ' + wallWidthFt + ' ft wall. Drag to position. Your photo stays on your device.'
    : 'Drag the painting to position it. Your photo stays on your device and is never uploaded.';
}

function loadWallPhoto(file) {
  var img = new Image();
  var url = URL.createObjectURL(file);
  img.onload = function () {
    if (wallUrl) URL.revokeObjectURL(wallUrl);
    wallUrl = url; wallImg = img;
    var long = 1400, w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, long / Math.max(w, h));
    rCanvas.width = Math.round(w * k);
    rCanvas.height = Math.round(h * k);
    artCX = null; artCY = null;
    setWallMode(true);
  };
  img.onerror = function () {
    URL.revokeObjectURL(url);
    var h = document.getElementById('wall-hint');
    document.getElementById('wall-tools').hidden = false;
    if (h) h.textContent = 'That photo couldn’t be opened. Please try a JPG or PNG photo.';
  };
  img.src = url;
}

function setWallMode(on) {
  wallMode = on;
  var scene = document.getElementById('room-scene');
  var overlay = document.getElementById('room-overlay');
  overlay.classList.toggle('wall-mode', on);
  document.getElementById('wall-tools').hidden = !on;
  document.getElementById('wall-sample').hidden = !on;
  document.getElementById('wall-upload-text').textContent = on ? 'New photo' : 'Try it on my wall';
  overlay.querySelectorAll('[data-rsc]').forEach(function (b) {
    b.closest('.room-ctrl').style.display = on ? 'none' : '';
  });
  if (on) {
    var ar = rCanvas.width / rCanvas.height;
    scene.style.aspectRatio = rCanvas.width + ' / ' + rCanvas.height;
    scene.style.width = 'min(100%, calc((100vh - 300px) * ' + ar.toFixed(4) + '))';
    scene.style.margin = '0 auto';
    updateHint();
  } else {
    scene.style.aspectRatio = scene.style.width = scene.style.margin = '';
    rCanvas.width = CANVAS_W; rCanvas.height = CANVAS_H;
  }
  drawRoom();
  if (on && typeof gtag === 'function') gtag('event', 'room_own_wall', { painting: document.title.split(' |')[0] });
}

function exitWallMode() { setWallMode(false); }

function setRoomScale(sc) {
  curScale = sc;
  document.querySelectorAll('[data-rsc]').forEach(function (b) {
    b.classList.toggle('active', b.dataset.rsc === sc);
  });
  drawRoom();
}

function setRoomStyle() { /* no-op */ }

function openRoom() {
  var o = document.getElementById('room-overlay');
  if (!o) return;
  rCanvas = document.getElementById('room-canvas');
  rCtx = rCanvas ? rCanvas.getContext('2d') : null;
  if (PAINT_W_IN === null) PAINT_W_IN = readPaintingWidth();
  buildWallControls();
  o.classList.add('open');
  document.body.style.overflow = 'hidden';
  o.querySelectorAll('.room-ctrl').forEach(function (ctrl) {
    if (ctrl.querySelector('[data-rs]')) ctrl.style.display = 'none';
  });
  setTimeout(function () {
    var img = document.getElementById('room-art-img');
    if (img && img.complete && img.naturalWidth > 0) { rImg = img; drawRoom(); }
    else if (img) { rImg = null; drawRoom(); img.onload = function () { rImg = img; drawRoom(); }; }
    else drawRoom();
  }, 40);
}

function closeRoom() {
  var o = document.getElementById('room-overlay');
  if (o) o.classList.remove('open');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeRoom(); });
