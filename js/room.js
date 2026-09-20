// Room preview — straight-on photo, simple rectangle placement (no perspective warp)
// Photo: images/room-bg.jpg (1720×1290, Auckland apartment, front-on accent wall)

var ROOM_SCALES = { small: 0.38, medium: 0.62, large: 0.90 };
var curScale = 'medium';
var rCanvas = null, rCtx = null, rImg = null, roomBgImg = null;

// Preload the room background photo
(function () {
  var bg = new Image();
  bg.onload = function () { roomBgImg = bg; if (rCtx) drawRoom(); };
  bg.src = '/images/room-bg.jpg';
})();

// ── Photo → canvas mapping (cover-fill, 860×537 canvas) ──────────────────────
var PHOTO_W = 1720, PHOTO_H = 1290;
var CANVAS_W = 860, CANVAS_H = 537;
var PHOTO_SCALE = CANVAS_W / PHOTO_W;              // exactly 0.5
var PHOTO_DY    = (CANVAS_H - PHOTO_H * PHOTO_SCALE) / 2; // = -54

// ── Wall hanging zone (canvas coordinates) ───────────────────────────────────
// Paintings hang on the dark accent wall, above the sofa.
// SOFA_Y: canvas y just above cushion tops — paintings must stay ABOVE this.
// Original photo (3264×2448) cushion tops ≈ y=1200 → ÷2=600 in 1720×1290
// canvas y = -54 + 600*0.5 = 246 → using 240 with comfortable gap.
var WALL_LEFT  =  40;   // horizontal breathing room (canvas px)
var WALL_RIGHT = 820;
var WALL_TOP   =  15;   // just below ceiling cornice
var SOFA_Y     = 240;   // painting bottom limit (large paintings stop above this)
var HANG_CY    = 160;   // eye-level centre for small/medium paintings

// ── Main draw ─────────────────────────────────────────────────────────────────
function drawRoom() {
  if (!rCtx) return;
  var ctx = rCtx;
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  // ── 1. Room background (full photo, cover-fill) ───────────────────────────
  if (roomBgImg && roomBgImg.naturalWidth > 0) {
    ctx.drawImage(roomBgImg,
      0, 0, PHOTO_W, PHOTO_H,
      0, PHOTO_DY, CANVAS_W, PHOTO_H * PHOTO_SCALE
    );
  } else {
    ctx.fillStyle = '#5a5e6a';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  // ── 2. Artwork on wall (simple rectangle, no perspective warp) ────────────
  if (rImg && rImg.naturalWidth > 0) {
    var sc = ROOM_SCALES[curScale] || 0.62;

    var availW = WALL_RIGHT - WALL_LEFT;   // 780
    var availH = SOFA_Y    - WALL_TOP;    // 200

    var maxW = availW * sc;
    var maxH = availH * sc;

    // Fit painting inside maxW × maxH, preserving aspect ratio
    var imgAspect = rImg.naturalWidth / rImg.naturalHeight;  // w/h
    var pw, ph;
    if (maxW / maxH > imgAspect) {
      ph = maxH; pw = ph * imgAspect;   // height constrains
    } else {
      pw = maxW; ph = pw / imgAspect;   // width constrains
    }

    // Horizontal: always centred on the wall
    var cx = (WALL_LEFT + WALL_RIGHT) / 2;  // 430

    // Vertical: large pins bottom just above sofa; small/medium at eye-level centre
    var cy;
    if (curScale === 'large') {
      cy = SOFA_Y - 15 - ph / 2;
    } else {
      cy = HANG_CY;
    }

    var left = Math.round(cx - pw / 2);
    var top  = Math.round(cy - ph / 2);
    pw = Math.round(pw);
    ph = Math.round(ph);

    // Shadow
    ctx.save();
    ctx.shadowColor   = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur    = 20;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 7;
    ctx.fillStyle     = '#080808';
    ctx.fillRect(left - 3, top - 3, pw + 6, ph + 6);
    ctx.restore();

    // Thin frame
    ctx.fillStyle = 'rgba(25,18,8,0.70)';
    ctx.fillRect(left - 3, top - 3, pw + 6, ph + 6);

    // Artwork
    ctx.drawImage(rImg, left, top, pw, ph);

    // Subtle glare
    ctx.save();
    var glare = ctx.createLinearGradient(left, top, left + pw, top + ph);
    glare.addColorStop(0,   'rgba(255,255,255,0.09)');
    glare.addColorStop(0.4, 'rgba(255,255,255,0.02)');
    glare.addColorStop(1,   'rgba(255,255,255,0)');
    ctx.fillStyle = glare;
    ctx.fillRect(left, top, pw, ph);
    ctx.restore();
  }

  // ── 3. Vignette ───────────────────────────────────────────────────────────
  var vig = ctx.createRadialGradient(
    CANVAS_W * 0.50, CANVAS_H * 0.45, CANVAS_H * 0.20,
    CANVAS_W * 0.50, CANVAS_H * 0.45, CANVAS_H * 0.82
  );
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
}

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
  o.classList.add('open');
  document.body.style.overflow = 'hidden';
  o.querySelectorAll('.room-ctrl').forEach(function (ctrl) {
    if (ctrl.querySelector('[data-rs]')) ctrl.style.display = 'none';
  });
  setTimeout(function () {
    var img = document.getElementById('room-art-img');
    if (img && img.complete && img.naturalWidth > 0) {
      rImg = img; drawRoom();
    } else if (img) {
      rImg = null; drawRoom();
      img.onload = function () { rImg = img; drawRoom(); };
    } else {
      drawRoom();
    }
  }, 40);
}

function closeRoom() {
  var o = document.getElementById('room-overlay');
  if (o) o.classList.remove('open');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeRoom(); });
