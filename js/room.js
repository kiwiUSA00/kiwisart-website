var ROOM_STYLES = {
  modern: { wall: '#e8e4de', baseboard: '#cbc7c0', floor: 'linear-gradient(180deg,#b5a590 0%,#8a7a6a 100%)' },
  warm:   { wall: '#d5c9b0', baseboard: '#b5a48a', floor: 'linear-gradient(180deg,#8a6e50 0%,#5e4a34 100%)' },
  dark:   { wall: '#252232', baseboard: '#18161f', floor: 'linear-gradient(180deg,#1a160c 0%,#0e0a06 100%)' }
};
var ROOM_SCALES = { small: '18%', medium: '30%', large: '46%' };
var curRoomStyle = 'modern', curRoomScale = 'medium';

function applyRoom() {
  var s = ROOM_STYLES[curRoomStyle];
  var wall  = document.getElementById('room-wall');
  var base  = document.getElementById('room-baseboard');
  var floor = document.getElementById('room-floor');
  var art   = document.getElementById('room-art');
  if (wall)  wall.style.background  = s.wall;
  if (base)  base.style.background  = s.baseboard;
  if (floor) floor.style.background = s.floor;
  if (art)   art.style.width        = ROOM_SCALES[curRoomScale];
}

function setRoomStyle(st) {
  curRoomStyle = st;
  document.querySelectorAll('[data-rs]').forEach(function(b) {
    b.classList.toggle('active', b.dataset.rs === st);
  });
  applyRoom();
}

function setRoomScale(sc) {
  curRoomScale = sc;
  document.querySelectorAll('[data-rsc]').forEach(function(b) {
    b.classList.toggle('active', b.dataset.rsc === sc);
  });
  applyRoom();
}

function openRoom() {
  var o = document.getElementById('room-overlay');
  if (!o) return;
  o.classList.add('open');
  applyRoom();
  document.body.style.overflow = 'hidden';
}

function closeRoom() {
  var o = document.getElementById('room-overlay');
  if (o) o.classList.remove('open');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeRoom();
});
