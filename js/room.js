var ROOM_STYLES = {
  modern: {
    ceiling: '#ccc8c1',
    back:    '#e8e4de',
    left:    'linear-gradient(to right, #bab6af, #d8d4ce)',
    right:   'linear-gradient(to left, #bab6af, #d8d4ce)',
    base:    '#cbc7c0',
    floor:   'linear-gradient(180deg,#c8b89e 0%,#8a7a6a 100%)',
    furn: '#c4bbb2', furnHi: '#d8d2cc', furnDark: '#a8a098'
  },
  warm: {
    ceiling: '#b8a880',
    back:    '#d5c9b0',
    left:    'linear-gradient(to right, #a89878, #c8bc9e)',
    right:   'linear-gradient(to left, #a89878, #c8bc9e)',
    base:    '#b5a48a',
    floor:   'linear-gradient(180deg,#b08060 0%,#5e4a34 100%)',
    furn: '#a08868', furnHi: '#b89878', furnDark: '#7d6a4e'
  },
  dark: {
    ceiling: '#161420',
    back:    '#252232',
    left:    'linear-gradient(to right, #0e0c18, #1e1c28)',
    right:   'linear-gradient(to left, #0e0c18, #1e1c28)',
    base:    '#18161f',
    floor:   'linear-gradient(180deg,#2a2018 0%,#0e0a06 100%)',
    furn: '#302c42', furnHi: '#3e3a52', furnDark: '#1c1a28'
  }
};
var ROOM_SCALES = { small: '20%', medium: '33%', large: '52%' };
var curRoomStyle = 'modern', curRoomScale = 'medium';

function applyRoom() {
  var s = ROOM_STYLES[curRoomStyle];
  var get = function(id) { return document.getElementById(id); };
  var el;
  if ((el = get('rm-ceiling'))) el.style.background = s.ceiling;
  if ((el = get('rm-back')))    el.style.background = s.back;
  if ((el = get('rm-left')))    el.style.background = s.left;
  if ((el = get('rm-right')))   el.style.background = s.right;
  if ((el = get('rm-base')))    el.style.background = s.base;
  if ((el = get('rm-floor')))   el.style.background = s.floor;
  if ((el = get('room-art')))   el.style.width = ROOM_SCALES[curRoomScale];
  var scene = document.querySelector('.room-scene');
  if (scene) {
    scene.style.setProperty('--furn', s.furn);
    scene.style.setProperty('--furn-hi', s.furnHi);
    scene.style.setProperty('--furn-dark', s.furnDark);
  }
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
  applyRoom();
  o.classList.add('open');
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
