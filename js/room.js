// Room preview — real photo background with artwork composited onto accent wall
// Photo: images/room-bg.jpg (1024×1024, Auckland apartment with blue-grey accent wall)
// Accent wall on the right side; painting placement measured from reference image

var ROOM_SCALES = { small: 0.55, medium: 0.78, large: 1.0 };
var curScale = 'medium';
var rCanvas = null, rCtx = null, rImg = null, roomBgImg = null;

// Preload the room background photo
(function () {
  var bg = new Image();
  bg.onload = function () { roomBgImg = bg; if (rCtx) drawRoom(); };
  bg.src = '/images/room-bg.jpg';
})();

// Map from 1024×1024 photo coordinates to canvas coordinates (860×537, cover-fill)
var PHOTO_W = 1024, PHOTO_H = 1024;
var CANVAS_W = 860, CANVAS_H = 537;
// Cover scale: fit to canvas width; top/bottom of photo are cropped
var PHOTO_SCALE = CANVAS_W / PHOTO_W;            // ≈ 0.840
var PHOTO_DY    = (CANVAS_H - PHOTO_H * PHOTO_SCALE) / 2;  // ≈ -161.5 (crops top/bottom)

function photoToCanvas(px, py) {
  return [px * PHOTO_SCALE, py * PHOTO_SCALE + PHOTO_DY];
}

// Wall area where the artwork will be shown (photo coords, 1024×1024 space)
// Covers the blue-grey accent wall on the right; artwork is centred within it
// Calibrated from reference placement of Koi painting on the wall
var WALL = { x1: 280, y1: 240, x2: 1000, y2: 720 };

function drawRoom() {
  if (!rCtx) return;
  var ctx = rCtx;
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  // ── Draw photo background ────────────────────────────────
  if (roomBgImg && roomBgImg.naturalWidth > 0) {
    // Source: full image (PHOTO_W × PHOTO_H). Dest: scaled to canvas width,
    // centred vertically (PHOTO_DY is negative → crops top/bottom equally).
    ctx.drawImage(roomBgImg,
      0, 0,
      PHOTO_W,
      PHOTO_H,
      0, PHOTO_DY,
      CANVAS_W,
      PHOTO_H * PHOTO_SCALE
    );
  } else {
    // Fallback plain background while photo loads
    ctx.fillStyle = '#8b909d';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  // ── Draw artwork on wall ─────────────────────────────────
  if (rImg && rImg.naturalWidth > 0) {
    var sc   = ROOM_SCALES[curScale] || 0.70;
    var wallW = (WALL.x2 - WALL.x1) * PHOTO_SCALE;
    var wallH = (WALL.y2 - WALL.y1) * PHOTO_SCALE;
    var wallC = photoToCanvas((WALL.x1 + WALL.x2) / 2, (WALL.y1 + WALL.y2) / 2);

    var aspect = rImg.naturalHeight / rImg.naturalWidth;
    var artW, artH;
    if (aspect >= 1) {
      // Portrait or square: constrain by height
      artH = wallH * sc;
      artW = artH / aspect;
    } else {
      // Landscape: constrain by width
      artW = wallW * sc;
      artH = artW * aspect;
    }

    var artX = wallC[0] - artW / 2;
    var artY = wallC[1] - artH / 2;

    // Shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur  = 20;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = '#111';
    ctx.fillRect(artX - 4, artY - 4, artW + 8, artH + 8);
    ctx.restore();

    // Frame
    ctx.fillStyle = 'rgba(40,30,15,0.60)';
    ctx.fillRect(artX - 4, artY - 4, artW + 8, artH + 8);

    // Artwork
    ctx.drawImage(rImg, artX, artY, artW, artH);

    // Subtle glass sheen
    var sheen = ctx.createLinearGradient(artX, artY, artX + artW * 0.65, artY + artH * 0.65);
    sheen.addColorStop(0, 'rgba(255,255,255,0.08)');
    sheen.addColorStop(0.5, 'rgba(255,255,255,0.03)');
    sheen.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sheen;
    ctx.fillRect(artX, artY, artW, artH);
  }

  // ── Vignette ─────────────────────────────────────────────
  var vig = ctx.createRadialGradient(
    CANVAS_W * 0.50, CANVAS_H * 0.44, CANVAS_H * 0.18,
    CANVAS_W * 0.50, CANVAS_H * 0.44, CANVAS_H * 0.80
  );
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.32)');
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

// Remove style buttons if they exist (no longer applicable to photo mode)
function setRoomStyle() { /* no-op — photo has no style variants */ }

function openRoom() {
  var o = document.getElementById('room-overlay');
  if (!o) return;
  rCanvas = document.getElementById('room-canvas');
  rCtx = rCanvas ? rCanvas.getContext('2d') : null;
  o.classList.add('open');
  document.body.style.overflow = 'hidden';
  // Hide "Room Style" controls — not applicable to photo mode
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
