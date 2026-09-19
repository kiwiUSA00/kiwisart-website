var ROOM_STYLES = {
  modern: {
    bg:           '#2a2a2a',
    ceiling:      '#d0ccc6',
    back:         '#e6e2dc',
    wallTexture:  'rgba(0,0,0,0.04)',
    sideOuter:    '#b0aca6',
    baseboard:    '#c8c4be',
    floorLight:   '#c8b090',
    floorDark:    '#7a6048',
    floorPlank:   'rgba(0,0,0,0.09)',
    furn:         '#b8b0a8', furnHi: '#cec8c2', furnDark: '#9c9490',
    plantStem:    '#4a7a3a', plantPot: '#a08878'
  },
  warm: {
    bg:           '#1e1008',
    ceiling:      '#b8a87a',
    back:         '#d2c6a8',
    wallTexture:  'rgba(0,0,0,0.04)',
    sideOuter:    '#987858',
    baseboard:    '#b0a080',
    floorLight:   '#b08858',
    floorDark:    '#503820',
    floorPlank:   'rgba(0,0,0,0.10)',
    furn:         '#9e8868', furnHi: '#b09878', furnDark: '#7c6a50',
    plantStem:    '#3a6030', plantPot: '#886048'
  },
  dark: {
    bg:           '#06040e',
    ceiling:      '#181624',
    back:         '#222030',
    wallTexture:  'rgba(255,255,255,0.025)',
    sideOuter:    '#0e0c1a',
    baseboard:    '#16141e',
    floorLight:   '#28200e',
    floorDark:    '#0a0806',
    floorPlank:   'rgba(255,255,255,0.04)',
    furn:         '#2c2840', furnHi: '#38344e', furnDark: '#1a1828',
    plantStem:    '#1e3818', plantPot: '#382820'
  }
};

var ROOM_SCALES = { small: 0.22, medium: 0.36, large: 0.56 };
var curStyle = 'modern', curScale = 'medium';
var roomCanvas = null, roomCtx = null;

function initRoom() {
  roomCanvas = document.getElementById('room-canvas');
  if (!roomCanvas) return;
  roomCtx = roomCanvas.getContext('2d');
  // Make canvas responsive
  fitCanvas();
  window.addEventListener('resize', fitCanvas);
}

function fitCanvas() {
  if (!roomCanvas) return;
  var container = roomCanvas.parentElement;
  var w = container.clientWidth;
  roomCanvas.style.width = w + 'px';
  roomCanvas.style.height = Math.round(w * 537 / 860) + 'px';
}

function drawRoom() {
  if (!roomCtx) return;
  var s = ROOM_STYLES[curStyle];
  var W = 860, H = 537; // logical canvas size (always draw at this resolution)
  var ctx = roomCtx;
  ctx.clearRect(0, 0, W, H);

  // ── Perspective geometry ───────────────────────────────────
  // Vanishing point (center of back wall, ~30% from top)
  var VX = W * 0.50;
  var VY = H * 0.28;

  // Back wall: left/right/top/bottom
  var BL = W * 0.16;   // left edge
  var BR = W * 0.84;   // right edge
  var BT = H * 0.00;   // top (starts at top of canvas)
  var BB = H * 0.70;   // bottom of wall / top of visible floor join

  // Outer floor/wall intersection
  var FL = 0, FR = W;
  var FB = H;          // floor goes to canvas bottom

  // ── Fill background ───────────────────────────────────────
  ctx.fillStyle = s.bg;
  ctx.fillRect(0, 0, W, H);

  // ── Ceiling (trapezoid) ───────────────────────────────────
  ctx.fillStyle = s.ceiling;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(W, 0);
  ctx.lineTo(BR, BT);
  ctx.lineTo(BL, BT);
  ctx.closePath();
  ctx.fill();

  // ── Left side wall ────────────────────────────────────────
  var lgL = ctx.createLinearGradient(0, 0, BL, 0);
  lgL.addColorStop(0, s.sideOuter);
  lgL.addColorStop(1, s.back);
  ctx.fillStyle = lgL;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(BL, BT);
  ctx.lineTo(BL, BB);
  ctx.lineTo(0, H * 0.72);
  ctx.closePath();
  ctx.fill();

  // ── Right side wall ───────────────────────────────────────
  var lgR = ctx.createLinearGradient(W, 0, BR, 0);
  lgR.addColorStop(0, s.sideOuter);
  lgR.addColorStop(1, s.back);
  ctx.fillStyle = lgR;
  ctx.beginPath();
  ctx.moveTo(W, 0);
  ctx.lineTo(BR, BT);
  ctx.lineTo(BR, BB);
  ctx.lineTo(W, H * 0.72);
  ctx.closePath();
  ctx.fill();

  // ── Back wall ─────────────────────────────────────────────
  ctx.fillStyle = s.back;
  ctx.fillRect(BL, BT, BR - BL, BB - BT);

  // Wall texture: very faint horizontal lines (plaster/paint)
  ctx.strokeStyle = s.wallTexture;
  ctx.lineWidth = 0.7;
  for (var ty = 18; ty < BB; ty += 24) {
    ctx.beginPath();
    ctx.moveTo(BL, ty);
    ctx.lineTo(BR, ty);
    ctx.stroke();
  }

  // Soft ambient shadow at sides of back wall (makes it pop)
  var wallShL = ctx.createLinearGradient(BL, 0, BL + 60, 0);
  wallShL.addColorStop(0, 'rgba(0,0,0,0.10)');
  wallShL.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = wallShL;
  ctx.fillRect(BL, BT, 60, BB - BT);

  var wallShR = ctx.createLinearGradient(BR, 0, BR - 60, 0);
  wallShR.addColorStop(0, 'rgba(0,0,0,0.10)');
  wallShR.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = wallShR;
  ctx.fillRect(BR - 60, BT, 60, BB - BT);

  // Spotlight behind painting position (warm glow on wall)
  var spotX = VX, spotY = (BT + BB) * 0.45;
  var spot = ctx.createRadialGradient(spotX, spotY, 0, spotX, spotY, (BR - BL) * 0.4);
  spot.addColorStop(0, 'rgba(255,242,200,0.15)');
  spot.addColorStop(1, 'rgba(255,242,200,0)');
  ctx.fillStyle = spot;
  ctx.fillRect(BL, BT, BR - BL, BB - BT);

  // ── Baseboard ─────────────────────────────────────────────
  ctx.fillStyle = s.baseboard;
  ctx.fillRect(BL, BB - 10, BR - BL, 10);
  // baseboard highlight
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(BL, BB - 10, BR - BL, 2);

  // ── Floor ─────────────────────────────────────────────────
  // Trapezoid floor shape (wider at bottom)
  var floorGrad = ctx.createLinearGradient(VX, BB, VX, H);
  floorGrad.addColorStop(0, s.floorLight);
  floorGrad.addColorStop(0.6, s.floorDark);
  floorGrad.addColorStop(1, s.floorDark);
  ctx.fillStyle = floorGrad;
  ctx.beginPath();
  ctx.moveTo(BL, BB);
  ctx.lineTo(BR, BB);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();

  // Floor plank lines: vertical planks converging to vanishing point
  ctx.strokeStyle = s.floorPlank;
  ctx.lineWidth = 1;
  var numPlanks = 14;
  for (var pi = 0; pi <= numPlanks; pi++) {
    var bx = (W / numPlanks) * pi; // position at canvas bottom
    // Converge toward vanishing point along the wall-floor join
    var wx = BL + (BR - BL) * (pi / numPlanks);
    ctx.beginPath();
    ctx.moveTo(bx, H);
    ctx.lineTo(wx, BB);
    ctx.stroke();
  }

  // Floor horizontal joints (foreshortened, spaced logarithmically)
  var joints = [0.12, 0.28, 0.46, 0.63, 0.78, 0.90];
  joints.forEach(function(t) {
    var y = BB + (H - BB) * t;
    var lx = BL + (0 - BL) * t;
    var rx = BR + (W - BR) * t;
    ctx.beginPath();
    ctx.moveTo(lx, y);
    ctx.lineTo(rx, y);
    ctx.stroke();
  });

  // ── Position painting img overlay ─────────────────────────
  var sc = ROOM_SCALES[curScale] || 0.36;
  var artW = (BR - BL) * sc;
  var artX = BL + (BR - BL - artW) / 2;
  // Hang painting at ~42% height on wall
  var hangCenter = BT + (BB - BT) * 0.42;

  var artImg = document.getElementById('room-art-img');
  if (artImg) {
    // Convert logical coords to percentage of canvas element size
    // The canvas element is scaled via CSS; use percentage-based positioning
    artImg.style.left   = (artX / W * 100) + '%';
    artImg.style.top    = ((hangCenter / H * 100) - 0) + '%'; // will be adjusted by transform
    artImg.style.width  = (artW / W * 100) + '%';
    artImg.style.transform = 'translateY(-42%)'; // offset so 42% of img height is above center
  }
}

function applyRoom() {
  var s = ROOM_STYLES[curStyle];
  // Update furniture CSS vars
  var scene = document.getElementById('room-scene');
  if (scene) {
    scene.style.setProperty('--furn', s.furn);
    scene.style.setProperty('--furn-hi', s.furnHi);
    scene.style.setProperty('--furn-dark', s.furnDark);
    scene.style.setProperty('--plant-stem', s.plantStem);
    scene.style.setProperty('--plant-pot', s.plantPot);
  }
  drawRoom();
}

function setRoomStyle(st) {
  curStyle = st;
  document.querySelectorAll('[data-rs]').forEach(function(b) {
    b.classList.toggle('active', b.dataset.rs === st);
  });
  applyRoom();
}

function setRoomScale(sc) {
  curScale = sc;
  document.querySelectorAll('[data-rsc]').forEach(function(b) {
    b.classList.toggle('active', b.dataset.rsc === sc);
  });
  applyRoom();
}

function openRoom() {
  var o = document.getElementById('room-overlay');
  if (!o) return;
  if (!roomCanvas) initRoom();
  o.classList.add('open');
  document.body.style.overflow = 'hidden';
  // Small delay so layout is settled before drawing
  setTimeout(function() { fitCanvas(); applyRoom(); }, 30);
}

function closeRoom() {
  var o = document.getElementById('room-overlay');
  if (o) o.classList.remove('open');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeRoom();
});
