// Room preview — real photo background with artwork composited onto accent wall
// Photo: images/room-bg.jpg (1024×1024, Auckland apartment with blue-grey accent wall)
// Ceiling in room rises left→right (perspective: wall recedes to upper-right),
// so the painting quad is taller on the right than the left.

var ROOM_SCALES = { small: 0.55, medium: 0.78, large: 1.0 };
var curScale = 'medium';
var rCanvas = null, rCtx = null, rImg = null, roomBgImg = null;

// Preload the room background photo
(function () {
  var bg = new Image();
  bg.onload = function () { roomBgImg = bg; if (rCtx) drawRoom(); };
  bg.src = '/images/room-bg.jpg';
})();

// ── Photo → canvas mapping (cover-fill, 860×537 canvas) ──────────────────────
var PHOTO_W = 1024, PHOTO_H = 1024;
var CANVAS_W = 860, CANVAS_H = 537;
var PHOTO_SCALE = CANVAS_W / PHOTO_W;           // ≈ 0.840
var PHOTO_DY    = (CANVAS_H - PHOTO_H * PHOTO_SCALE) / 2; // ≈ -161.5 (crops top/bottom)

// ── Perspective quad for the accent wall (canvas coords) ─────────────────────
// Four corners where artwork appears at scale = 1.0 (large).
// Ceiling rises right → top-right (TR) has a smaller y than top-left (TL).
// Floor is level → BL and BR share the same y.
//   TL──────TR
//   │        │  right side is taller (wall recedes into scene upper-right)
//   BL──────BR
var QUAD = {
  tl: [462,  55],   // left wall top  — ceiling line on left side
  tr: [852,   8],   // right wall top — ceiling rises toward right (perspective)
  br: [852, 508],   // right wall bottom — floor lower on right (closer to camera)
  bl: [462, 442]    // left wall bottom — floor higher on left (farther from camera)
};

// ── Perspective-correct image draw (horizontal-strip method) ─────────────────
// Maps img onto a quadrilateral defined by four canvas-space corner points.
// 50 strips gives smooth results with negligible CPU cost on a static frame.
function drawImageQuad(ctx, img, tl, tr, br, bl) {
  var iw = img.naturalWidth, ih = img.naturalHeight;
  var N  = 50;
  ctx.save();
  for (var i = 0; i < N; i++) {
    var t0 = i / N, t1 = (i + 1) / N;

    // Interpolate left and right edges of this strip
    var lx0 = tl[0] + (bl[0] - tl[0]) * t0,  ly0 = tl[1] + (bl[1] - tl[1]) * t0;
    var lx1 = tl[0] + (bl[0] - tl[0]) * t1,  ly1 = tl[1] + (bl[1] - tl[1]) * t1;
    var rx0 = tr[0] + (br[0] - tr[0]) * t0,   ry0 = tr[1] + (br[1] - tr[1]) * t0;
    var rx1 = tr[0] + (br[0] - tr[0]) * t1,   ry1 = tr[1] + (br[1] - tr[1]) * t1;

    // Source strip rows
    var sy = t0 * ih, sh = (t1 - t0) * ih;

    // Affine transform:  (0, sy)→(lx0,ly0)  (iw, sy)→(rx0,ry0)  (0, sy+sh)→(lx1,ly1)
    var a = (rx0 - lx0) / iw;
    var b = (ry0 - ly0) / iw;
    var c = (lx1 - lx0) / sh;
    var d = (ly1 - ly0) / sh;
    var e = lx0 - c * sy;
    var f = ly0 - d * sy;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(lx0, ly0);
    ctx.lineTo(rx0, ry0);
    ctx.lineTo(rx1, ry1);
    ctx.lineTo(lx1, ly1);
    ctx.closePath();
    ctx.clip();
    ctx.transform(a, b, c, d, e, f);
    ctx.drawImage(img, 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

// ── Scale a quad toward its centroid ─────────────────────────────────────────
function scaleQuad(q, wsc, hsc) {
  var cx = (q.tl[0] + q.tr[0] + q.br[0] + q.bl[0]) / 4;
  var cy = (q.tl[1] + q.tr[1] + q.br[1] + q.bl[1]) / 4;
  function sc(pt) {
    return [cx + (pt[0] - cx) * wsc, cy + (pt[1] - cy) * hsc];
  }
  return { tl: sc(q.tl), tr: sc(q.tr), br: sc(q.br), bl: sc(q.bl) };
}

// ── Main draw ─────────────────────────────────────────────────────────────────
function drawRoom() {
  if (!rCtx) return;
  var ctx = rCtx;
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  // ── Background photo ──────────────────────────────────────────────────────
  if (roomBgImg && roomBgImg.naturalWidth > 0) {
    ctx.drawImage(roomBgImg,
      0, 0, PHOTO_W, PHOTO_H,   // full source
      0, PHOTO_DY, CANVAS_W, PHOTO_H * PHOTO_SCALE // cover-fill dest
    );
  } else {
    ctx.fillStyle = '#7a8090';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  // ── Artwork on wall (perspective-correct) ─────────────────────────────────
  if (rImg && rImg.naturalWidth > 0) {
    var sc = ROOM_SCALES[curScale] || 0.78;

    // Effective wall dimensions (average of left/right and top/bottom)
    var wallW = ((QUAD.tr[0] - QUAD.tl[0]) + (QUAD.br[0] - QUAD.bl[0])) / 2;
    var wallH = ((QUAD.bl[1] - QUAD.tl[1]) + (QUAD.br[1] - QUAD.tr[1])) / 2;

    // Determine whether width or height is the constraining dimension
    var aspect  = rImg.naturalHeight / rImg.naturalWidth; // h/w
    var wallAsp = wallH / wallW;
    var wScale, hScale;
    if (aspect >= wallAsp) {
      // Portrait-ish relative to wall: height constrains
      hScale = sc;
      wScale = sc * (wallH / aspect) / wallW; // shrink width to match aspect
    } else {
      // Landscape-ish relative to wall: width constrains
      wScale = sc;
      hScale = sc * (wallW * aspect) / wallH; // shrink height to match aspect
    }

    var q = scaleQuad(QUAD, wScale, hScale);

    // Shadow (draw a slightly-larger dark quad behind the artwork)
    var pad = 5;
    var shadowQ = scaleQuad(QUAD,
      wScale  + pad / wallW * 2,
      hScale  + pad / wallH * 2
    );
    ctx.save();
    ctx.shadowColor    = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur     = 22;
    ctx.shadowOffsetX  = 4;
    ctx.shadowOffsetY  = 8;
    ctx.fillStyle = '#0a0a0a';
    ctx.beginPath();
    ctx.moveTo(shadowQ.tl[0], shadowQ.tl[1]);
    ctx.lineTo(shadowQ.tr[0], shadowQ.tr[1]);
    ctx.lineTo(shadowQ.br[0], shadowQ.br[1]);
    ctx.lineTo(shadowQ.bl[0], shadowQ.bl[1]);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Frame (thin dark border — also a perspective quad)
    var frameQ = scaleQuad(QUAD,
      wScale  + 3 / wallW * 2,
      hScale  + 3 / wallH * 2
    );
    ctx.save();
    ctx.fillStyle = 'rgba(30,22,10,0.65)';
    ctx.beginPath();
    ctx.moveTo(frameQ.tl[0], frameQ.tl[1]);
    ctx.lineTo(frameQ.tr[0], frameQ.tr[1]);
    ctx.lineTo(frameQ.br[0], frameQ.br[1]);
    ctx.lineTo(frameQ.bl[0], frameQ.bl[1]);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Artwork — perspective-warped onto the quad
    drawImageQuad(ctx, rImg, q.tl, q.tr, q.br, q.bl);

    // Subtle glare: lighten top-left corner slightly (follows wall light source)
    ctx.save();
    var glare = ctx.createLinearGradient(
      q.tl[0], q.tl[1],
      q.br[0], q.br[1]
    );
    glare.addColorStop(0,   'rgba(255,255,255,0.10)');
    glare.addColorStop(0.4, 'rgba(255,255,255,0.03)');
    glare.addColorStop(1,   'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.moveTo(q.tl[0], q.tl[1]);
    ctx.lineTo(q.tr[0], q.tr[1]);
    ctx.lineTo(q.br[0], q.br[1]);
    ctx.lineTo(q.bl[0], q.bl[1]);
    ctx.closePath();
    ctx.fillStyle = glare;
    ctx.fill();
    ctx.restore();
  }

  // ── Vignette ──────────────────────────────────────────────────────────────
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
