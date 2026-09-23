// Painting enquiries — contact.html?painting=<slug> pre-fills the form for that painting.
(function () {
  var PAINTINGS = {
    'ebb-and-flow':        ['Ebb and Flow',        ''],
    'waves':               ['Waves',               '46½ × 30¾ in'],
    'koi':                 ['Koi',                 '46½ × 30¾ in'],
    'snow-storm':          ['Snow Storm',          '78¾ × 55 in'],
    'sea-foam':            ['Sea Foam',            '55 × 39¼ in'],
    'fight':               ['Fight',               '78¾ × 55 in'],
    'spring-bloom':        ['Spring Bloom',        '78¾ × 55 in'],
    'milky-way':           ['Milky Way',           '78¾ × 55 in'],
    'tidal-pool':          ['Tidal Pool',          '78¾ × 55 in'],
    'fire-is-raging':      ['Fire is Raging',      '78¾ × 55 in'],
    'spring-is-awakening': ['Spring is Awakening', '78¾ × 55 in'],
    'winter-is-coming':    ['Winter is Coming',    '78¾ × 55 in']
  };
  var m = /[?&]painting=([a-z-]+)/.exec(window.location.search);
  var slug = m && m[1];
  if (!slug || !PAINTINGS[slug]) return;
  var title = PAINTINGS[slug][0], dims = PAINTINGS[slug][1];

  var form = document.getElementById('contact-form');
  if (!form) return;

  // Header copy
  var eyebrow = document.querySelector('main .eyebrow');
  var h1 = document.querySelector('main h1');
  var lede = document.querySelector('main .lede');
  if (eyebrow) eyebrow.textContent = 'Painting Enquiry';
  if (h1) h1.textContent = 'Enquire about “' + title + '”';
  if (lede) lede.textContent = 'Ask about availability, pricing, shipping or arranging a viewing. Kiwi will reply personally.';
  document.title = 'Enquire about ' + title + ' | Kiwi\'s Art';

  // Painting summary card
  var card = document.createElement('a');
  card.className = 'enquiry-piece';
  card.href = '/gallery/' + slug + '.html';
  card.innerHTML = '<img alt="" width="120" height="80">' +
    '<span><strong></strong><span class="enquiry-dims"></span><span class="enquiry-change">Original painting · view details</span></span>';
  card.querySelector('img').src = '/images/' + slug + '.jpg';
  card.querySelector('strong').textContent = title;
  card.querySelector('.enquiry-dims').textContent = dims || 'New original painting';
  form.parentNode.insertBefore(card, form);

  // "Interested in" choice
  var group = document.createElement('div');
  group.className = 'form-group';
  group.innerHTML =
    '<label for="ct-interest">I’d like to know about</label>' +
    '<select id="ct-interest" name="interest">' +
    '<option>Buying the original</option>' +
    '<option>Arranging a viewing</option>' +
    '<option>A commission in a similar style</option>' +
    '<option>Something else</option>' +
    '</select>';
  var msgGroup = document.getElementById('ct-message').closest('.form-group');
  form.insertBefore(group, msgGroup);

  // Hidden fields so the email to Kiwi names the painting
  function hidden(name, value) {
    var i = form.querySelector('input[name="' + name + '"]');
    if (!i) { i = document.createElement('input'); i.type = 'hidden'; i.name = name; form.insertBefore(i, form.firstChild); }
    i.value = value;
  }
  hidden('_subject', 'Painting enquiry: ' + title + ' — Kiwi\'s Art');
  hidden('painting', title + (dims ? ' (' + dims + ')' : '') + ' — https://kiwisart.com/gallery/' + slug + '.html');

  var msg = document.getElementById('ct-message');
  if (msg && !msg.value) {
    msg.value = 'Hi Kiwi, I’m interested in “' + title + '”' + (dims ? ' (' + dims + ')' : '') + '. ';
  }
  var btn = form.querySelector('button[type="submit"]');
  if (btn) btn.textContent = 'Send Enquiry';

  if (typeof gtag === 'function') gtag('event', 'enquiry_start', { painting: title });
  form.addEventListener('submit', function () {
    if (typeof gtag === 'function') gtag('event', 'enquiry_submit', { painting: title });
  });
})();
