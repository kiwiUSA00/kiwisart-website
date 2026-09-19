var ROOM_STYLES = {
  modern: {
    bg:'#1a1a1a', ceiling:'#ccc8c1', back:'#e5e1db',
    wallLine:'rgba(0,0,0,0.035)', sideOuter:'#aeaaa4', baseboard:'#c6c2bb',
    floorA:'#c0a882', floorB:'#7a6048', plankLine:'rgba(0,0,0,0.07)',
    sofaBase:'#b5ada4', sofaLight:'#cec7be', sofaDark:'#948c84',
    plantStem:'#5a8a48', plantPot:'#a08878', lampBase:'#9a9088'
  },
  warm: {
    bg:'#140c04', ceiling:'#b8a87a', back:'#d0c4a6',
    wallLine:'rgba(0,0,0,0.04)', sideOuter:'#9a8858', baseboard:'#ae9e78',
    floorA:'#a88050', floorB:'#4e3018', plankLine:'rgba(0,0,0,0.09)',
    sofaBase:'#9e8668', sofaLight:'#b49878', sofaDark:'#7a6450',
    plantStem:'#4a7038', plantPot:'#886048', lampBase:'#8a7058'
  },
  dark: {
    bg:'#06040c', ceiling:'#181626', back:'#201e2e',
    wallLine:'rgba(255,255,255,0.022)', sideOuter:'#0c0a18', baseboard:'#141220',
    floorA:'#221a0c', floorB:'#080604', plankLine:'rgba(255,255,255,0.035)',
    sofaBase:'#2c2840', sofaLight:'#3a3650', sofaDark:'#1a1828',
    plantStem:'#1a3016', plantPot:'#3a2818', lampBase:'#2a2638'
  }
};

var ROOM_SCALES = { small:0.20, medium:0.34, large:0.52 };
var curStyle = 'modern', curScale = 'medium';
var rCanvas = null, rCtx = null, rImg = null;

function adjB(hex, amt) {
  if (!hex || hex[0] !== '#' || hex.length < 7) return hex;
  var r = Math.min(255,Math.max(0,parseInt(hex.slice(1,3),16)+amt));
  var g = Math.min(255,Math.max(0,parseInt(hex.slice(3,5),16)+amt));
  var b = Math.min(255,Math.max(0,parseInt(hex.slice(5,7),16)+amt));
  return '#'+[r,g,b].map(function(v){return v.toString(16).padStart(2,'0');}).join('');
}

function rr(ctx,x,y,w,h,r) {
  if (w<2*r) r=w/2; if (h<2*r) r=h/2;
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
  ctx.arcTo(x+w,y,x+w,y+r,r); ctx.lineTo(x+w,y+h-r);
  ctx.arcTo(x+w,y+h,x+w-r,y+h,r); ctx.lineTo(x+r,y+h);
  ctx.arcTo(x,y+h,x,y+h-r,r); ctx.lineTo(x,y+r);
  ctx.arcTo(x,y,x+r,y,r); ctx.closePath();
}

function mkG(ctx,x1,y1,x2,y2,c0,c1) {
  var g=ctx.createLinearGradient(x1,y1,x2,y2);
  g.addColorStop(0,c0); g.addColorStop(1,c1); return g;
}

function drawRoom() {
  if (!rCtx) return;
  var s = ROOM_STYLES[curStyle];
  var W=860, H=537, ctx=rCtx;
  ctx.clearRect(0,0,W,H);

  // Geometry
  var VX=W*0.50;
  var BL=W*0.15, BR=W*0.85;
  var BT=0, BB=H*0.68;

  // Background
  ctx.fillStyle=s.bg; ctx.fillRect(0,0,W,H);

  // Ceiling
  ctx.fillStyle=s.ceiling;
  ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(W,0); ctx.lineTo(BR,BT); ctx.lineTo(BL,BT); ctx.fill();

  // Side walls with gradient
  function sideWall(pts, gx0, gx1, c0, c1) {
    var g=ctx.createLinearGradient(gx0,0,gx1,0);
    g.addColorStop(0,c0); g.addColorStop(1,c1);
    ctx.fillStyle=g; ctx.beginPath();
    pts.forEach(function(p,i){ i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]); });
    ctx.fill();
  }
  sideWall([[0,0],[BL,BT],[BL,BB],[0,H*0.72]], 0, BL, s.sideOuter, s.back);
  sideWall([[W,0],[BR,BT],[BR,BB],[W,H*0.72]], W, BR, s.sideOuter, s.back);

  // Back wall
  ctx.fillStyle=s.back; ctx.fillRect(BL,BT,BR-BL,BB-BT);

  // Wall texture lines
  ctx.strokeStyle=s.wallLine; ctx.lineWidth=0.6;
  for(var ty=22;ty<BB;ty+=26){ ctx.beginPath(); ctx.moveTo(BL,ty); ctx.lineTo(BR,ty); ctx.stroke(); }

  // Wall edge shadows
  [BL, BR].forEach(function(ex, side) {
    var gx = side===0 ? ctx.createLinearGradient(ex,0,ex+60,0) : ctx.createLinearGradient(ex,0,ex-60,0);
    gx.addColorStop(0,'rgba(0,0,0,0.13)'); gx.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=gx; ctx.fillRect(side===0?ex:ex-60,BT,60,BB-BT);
  });

  // Spotlight glow
  var sp=ctx.createRadialGradient(VX,H*0.28,0,VX,H*0.28,(BR-BL)*0.36);
  sp.addColorStop(0,'rgba(255,245,210,0.15)'); sp.addColorStop(1,'rgba(255,245,210,0)');
  ctx.fillStyle=sp; ctx.fillRect(BL,BT,BR-BL,BB-BT);

  // Baseboard
  ctx.fillStyle=s.baseboard; ctx.fillRect(BL,BB-9,BR-BL,9);
  ctx.fillStyle='rgba(255,255,255,0.18)'; ctx.fillRect(BL,BB-9,BR-BL,2);

  // Floor
  var fg=ctx.createLinearGradient(VX,BB,VX,H);
  fg.addColorStop(0,s.floorA); fg.addColorStop(0.65,s.floorB); fg.addColorStop(1,s.floorB);
  ctx.fillStyle=fg; ctx.beginPath();
  ctx.moveTo(BL,BB); ctx.lineTo(BR,BB); ctx.lineTo(W,H); ctx.lineTo(0,H); ctx.fill();

  // Floor planks converging
  ctx.strokeStyle=s.plankLine; ctx.lineWidth=1;
  for(var pi=0;pi<=16;pi++){
    var bx=(W/16)*pi, wx=BL+(BR-BL)*(pi/16);
    ctx.beginPath(); ctx.moveTo(bx,H); ctx.lineTo(wx,BB); ctx.stroke();
  }
  [0.10,0.24,0.40,0.57,0.73,0.88].forEach(function(t){
    var y=BB+(H-BB)*t, lx=BL*(1-t), rx=BR+(W-BR)*t;
    ctx.beginPath(); ctx.moveTo(lx,y); ctx.lineTo(rx,y); ctx.stroke();
  });

  // ── Painting ─────────────────────────────────────────────
  var sc=ROOM_SCALES[curScale]||0.34;
  var artW=(BR-BL)*sc;
  var artX=VX-artW/2;
  var hangCenter=BT+(BB-BT)*0.40;

  if (rImg && rImg.naturalWidth>0) {
    var aspect=rImg.naturalHeight/rImg.naturalWidth;
    var artH=artW*aspect;
    var artY=hangCenter-artH/2;

    // Cast shadow
    ctx.save();
    ctx.shadowColor='rgba(0,0,0,0.60)';
    ctx.shadowBlur=28; ctx.shadowOffsetX=4; ctx.shadowOffsetY=8;
    ctx.fillStyle='#000';
    ctx.fillRect(artX-4,artY-4,artW+8,artH+8);
    ctx.restore();

    // Frame
    ctx.fillStyle='rgba(55,42,22,0.55)';
    ctx.fillRect(artX-4,artY-4,artW+8,artH+8);

    // Painting
    ctx.drawImage(rImg,artX,artY,artW,artH);

    // Glass sheen
    var sheen=ctx.createLinearGradient(artX,artY,artX+artW*0.7,artY+artH*0.7);
    sheen.addColorStop(0,'rgba(255,255,255,0.07)');
    sheen.addColorStop(0.5,'rgba(255,255,255,0.02)');
    sheen.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=sheen; ctx.fillRect(artX,artY,artW,artH);
  }

  // ── Plant (left) ─────────────────────────────────────────
  drawPlant(ctx, BL*0.45, BB, H, s);

  // ── Sofa ─────────────────────────────────────────────────
  drawSofa(ctx, VX, BB, W, H, s);

  // ── Lamp (right) ─────────────────────────────────────────
  drawLamp(ctx, BR+(W-BR)*0.45, BB, H, s);

  // ── Vignette ─────────────────────────────────────────────
  var vig=ctx.createRadialGradient(VX,H*0.44,H*0.20,VX,H*0.44,H*0.78);
  vig.addColorStop(0,'rgba(0,0,0,0)'); vig.addColorStop(1,'rgba(0,0,0,0.42)');
  ctx.fillStyle=vig; ctx.fillRect(0,0,W,H);
}

function drawSofa(ctx,VX,BB,W,H,s) {
  var sw=W*0.60, sx=VX-sw/2;
  var sh=H*0.26, st=BB-sh;
  var backH=sh*0.66, backB=st+backH;
  var seatD=sh*0.085;
  var armW=sw*0.068;
  var clr=s.sofaBase, clrL=s.sofaLight, clrD=s.sofaDark;

  // Frame base (structural darkness behind everything)
  ctx.fillStyle=adjB(clrD,-15);
  rr(ctx,sx-armW,st+sh*0.08,sw+armW*2,sh-sh*0.08,4); ctx.fill();

  // Left arm top face
  ctx.fillStyle=mkG(ctx,sx-armW,st,sx-armW,st+sh*0.1,clrL,clr);
  rr(ctx,sx-armW,st+sh*0.06,armW,sh*0.1,4); ctx.fill();
  // Left arm front face
  ctx.fillStyle=mkG(ctx,sx-armW,st,sx-armW,BB,clr,clrD);
  rr(ctx,sx-armW,st+sh*0.14,armW,sh*0.86,5); ctx.fill();

  // Right arm top face
  ctx.fillStyle=mkG(ctx,sx+sw,st,sx+sw+armW,st+sh*0.1,clrL,clr);
  rr(ctx,sx+sw,st+sh*0.06,armW,sh*0.1,4); ctx.fill();
  // Right arm front face
  ctx.fillStyle=mkG(ctx,sx+sw,st,sx+sw,BB,clr,clrD);
  rr(ctx,sx+sw,st+sh*0.14,armW,sh*0.86,5); ctx.fill();

  // Three back cushions
  var nc=3, cw=sw/nc;
  for(var i=0;i<nc;i++){
    var cx=sx+i*cw, pad=2;
    var cg=ctx.createLinearGradient(cx,st,cx,backB);
    cg.addColorStop(0,clrL); cg.addColorStop(0.07,clr);
    cg.addColorStop(0.87,clr); cg.addColorStop(1,clrD);
    ctx.fillStyle=cg; rr(ctx,cx+pad,st+2,cw-pad*2,backH-2,9); ctx.fill();
    // Highlight
    ctx.fillStyle='rgba(255,255,255,0.17)';
    rr(ctx,cx+pad+8,st+5,cw-pad*2-16,13,5); ctx.fill();
    // Bottom crease
    ctx.fillStyle='rgba(0,0,0,0.12)';
    ctx.fillRect(cx+pad,backB-6,cw-pad*2,6);
    // Gap between cushions
    if(i<nc-1){ ctx.fillStyle='rgba(0,0,0,0.18)'; ctx.fillRect(cx+cw-2,st,5,backH); }
  }

  // Throw pillows
  function pillow(px,py,pw,ph,deg,dark){
    ctx.save();
    ctx.translate(px+pw/2,py+ph/2); ctx.rotate(deg*Math.PI/180);
    var pg=mkG(ctx,0,-ph/2,0,ph/2, dark?adjB(clrD,10):clrD, dark?clrD:adjB(clrD,-15));
    ctx.fillStyle=pg; rr(ctx,-pw/2,-ph/2,pw,ph,7); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.10)'; rr(ctx,-pw/2+5,-ph/2+5,pw-10,ph*0.45,5); ctx.fill();
    // Pillow seam lines
    ctx.strokeStyle='rgba(0,0,0,0.12)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(-pw/2+pw*0.25,-ph/2); ctx.lineTo(-pw/2+pw*0.25,ph/2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-pw/2,-ph*0.1); ctx.lineTo(pw/2,-ph*0.1); ctx.stroke();
    ctx.restore();
  }
  var pw=cw*0.46, ph=backH*0.52;
  pillow(sx+sw*0.04, st+backH*0.18, pw, ph, -8, false);
  pillow(sx+sw*0.60, st+backH*0.18, pw, ph,  7, true);

  // Seat top face (foreshortened, perspective effect)
  ctx.fillStyle=mkG(ctx,sx,backB,sx,backB+seatD, clrL, clr);
  ctx.fillRect(sx-armW,backB,sw+armW*2,seatD);
  // Seat cushion divisions visible on top
  ctx.strokeStyle='rgba(0,0,0,0.08)'; ctx.lineWidth=1;
  [1,2].forEach(function(j){
    ctx.beginPath(); ctx.moveTo(sx+cw*j,backB); ctx.lineTo(sx+cw*j,backB+seatD); ctx.stroke();
  });

  // Seat front face
  ctx.fillStyle=mkG(ctx,sx,backB+seatD,sx,BB, clr, adjB(clrD,-5));
  ctx.fillRect(sx-armW,backB+seatD,sw+armW*2,BB-backB-seatD);

  // Legs (tapered, slightly visible below seat front)
  var legH=H*0.04, legW=11;
  ctx.fillStyle=adjB(clrD,-25);
  [[sx+18,BB],[sx+sw-26,BB],[sx+sw*0.33,BB],[sx+sw*0.67,BB]].forEach(function(l){
    ctx.fillRect(l[0],l[1],legW,legH);
    // Leg highlight
    ctx.fillStyle='rgba(255,255,255,0.08)'; ctx.fillRect(l[0],l[1],3,legH);
    ctx.fillStyle=adjB(clrD,-25);
  });
}

function drawLamp(ctx,x,BB,H,s) {
  var lh=H*0.42, ly=BB-lh;
  // Shade (trapezoid)
  var shw1=22, shw2=13, shh=H*0.085;
  ctx.fillStyle=mkG(ctx,x,ly,x,ly+shh, s.sofaLight, adjB(s.sofaBase,-5));
  ctx.beginPath();
  ctx.moveTo(x-shw1,ly); ctx.lineTo(x+shw1,ly);
  ctx.lineTo(x+shw2,ly+shh); ctx.lineTo(x-shw2,ly+shh); ctx.fill();
  // Shade rim
  ctx.strokeStyle=adjB(s.lampBase,-10); ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(x-shw1-1,ly); ctx.lineTo(x+shw1+1,ly); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x-shw2-1,ly+shh); ctx.lineTo(x+shw2+1,ly+shh); ctx.stroke();
  // Glow from shade top
  var glow=ctx.createRadialGradient(x,ly,0,x,ly,40);
  glow.addColorStop(0,'rgba(255,240,180,0.22)'); glow.addColorStop(1,'rgba(255,240,180,0)');
  ctx.fillStyle=glow; ctx.beginPath(); ctx.arc(x,ly,40,0,Math.PI*2); ctx.fill();
  // Pole
  ctx.fillStyle=mkG(ctx,x-3,ly+shh,x+3,ly+shh, adjB(s.lampBase,15), s.lampBase);
  ctx.fillRect(x-3,ly+shh,6,lh-shh-H*0.05);
  // Base
  var by=BB-H*0.05;
  ctx.fillStyle=mkG(ctx,x,by,x,BB, adjB(s.lampBase,10), adjB(s.lampBase,-10));
  rr(ctx,x-18,by,36,H*0.05,5); ctx.fill();
  // Base highlight
  ctx.fillStyle='rgba(255,255,255,0.10)'; rr(ctx,x-16,by+2,32,6,3); ctx.fill();
}

function drawPlant(ctx,x,BB,H,s) {
  var potH=H*0.10, potW=42, potY=BB-potH;
  // Pot body (tapered)
  ctx.fillStyle=mkG(ctx,x,potY,x,BB, adjB(s.plantPot,15), adjB(s.plantPot,-10));
  ctx.beginPath();
  ctx.moveTo(x-potW*0.38,potY); ctx.lineTo(x+potW*0.38,potY);
  ctx.lineTo(x+potW*0.5,BB); ctx.lineTo(x-potW*0.5,BB); ctx.fill();
  // Pot rim
  ctx.fillStyle=adjB(s.plantPot,20);
  rr(ctx,x-potW*0.42,potY-5,potW*0.84,10,3); ctx.fill();
  // Soil
  ctx.fillStyle=adjB(s.plantPot,-25);
  rr(ctx,x-potW*0.35,potY,potW*0.70,9,2); ctx.fill();
  // Pot highlight
  ctx.fillStyle='rgba(255,255,255,0.12)'; ctx.fillRect(x-potW*0.38,potY,8,potH*0.7);

  // Stems
  ctx.strokeStyle=s.plantStem; ctx.lineCap='round';
  var stemBase=potY;
  function stem(cpx,cpy,ex,ey,w) {
    ctx.lineWidth=w;
    ctx.beginPath(); ctx.moveTo(x,stemBase); ctx.quadraticCurveTo(cpx,cpy,ex,ey); ctx.stroke();
  }
  stem(x-18,stemBase-H*0.08, x-26,stemBase-H*0.17, 3.5);
  stem(x-4, stemBase-H*0.10, x-6, stemBase-H*0.22, 3);
  stem(x+10,stemBase-H*0.07, x+24,stemBase-H*0.18, 3.5);
  stem(x-8, stemBase-H*0.12, x-16,stemBase-H*0.28, 2.5);
  stem(x+6, stemBase-H*0.09, x+18,stemBase-H*0.24, 2.5);

  // Leaves
  function leaf(ex,ey,lw,lh,angle) {
    ctx.save(); ctx.translate(ex,ey); ctx.rotate(angle*Math.PI/180);
    var lg=ctx.createRadialGradient(0,-lh*0.2,0,0,0,Math.max(lw,lh));
    lg.addColorStop(0,adjB(s.plantStem,20)); lg.addColorStop(1,s.plantStem);
    ctx.fillStyle=lg;
    ctx.beginPath(); ctx.ellipse(0,0,lw,lh,0,0,Math.PI*2); ctx.fill();
    // Leaf vein
    ctx.strokeStyle='rgba(255,255,255,0.15)'; ctx.lineWidth=1; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(0,-lh*0.7); ctx.lineTo(0,lh*0.7); ctx.stroke();
    ctx.restore();
  }
  leaf(x-26, stemBase-H*0.17, 14, 24, -30);
  leaf(x-6,  stemBase-H*0.22, 12, 22, -5);
  leaf(x+24, stemBase-H*0.18, 14, 24, 28);
  leaf(x-16, stemBase-H*0.28, 11, 20, -20);
  leaf(x+18, stemBase-H*0.24, 12, 21, 22);
}

function applyRoom() { drawRoom(); }

function setRoomStyle(st) {
  curStyle=st;
  document.querySelectorAll('[data-rs]').forEach(function(b){ b.classList.toggle('active',b.dataset.rs===st); });
  applyRoom();
}

function setRoomScale(sc) {
  curScale=sc;
  document.querySelectorAll('[data-rsc]').forEach(function(b){ b.classList.toggle('active',b.dataset.rsc===sc); });
  applyRoom();
}

function openRoom() {
  var o=document.getElementById('room-overlay');
  if (!o) return;
  rCanvas=document.getElementById('room-canvas');
  rCtx=rCanvas?rCanvas.getContext('2d'):null;
  o.classList.add('open');
  document.body.style.overflow='hidden';
  setTimeout(function(){
    var img=document.getElementById('room-art-img');
    if (img && img.complete && img.naturalWidth>0) {
      rImg=img; applyRoom();
    } else if (img) {
      rImg=null; applyRoom(); // draw room without painting first
      img.onload=function(){ rImg=img; applyRoom(); };
    } else {
      applyRoom();
    }
  },40);
}

function closeRoom() {
  var o=document.getElementById('room-overlay');
  if (o) o.classList.remove('open');
  document.body.style.overflow='';
}

document.addEventListener('keydown',function(e){ if(e.key==='Escape') closeRoom(); });
