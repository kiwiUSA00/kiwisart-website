(function () {
  var images = [
    "/images/ice-melt.jpg",
    "/images/ebb-and-flow.jpg",
    "/images/waves.jpg",
    "/images/koi.jpg",
    "/images/snow-storm.jpg",
    "/images/sea-foam.jpg",
    "/images/fight.jpg",
    "/images/spring-bloom.jpg",
    "/images/milky-way.jpg",
    "/images/tidal-pool.jpg",
    "/images/fire-is-raging.jpg",
    "/images/spring-is-awakening.jpg",
    "/images/winter-is-coming.jpg"
  ];

  // Shuffle so we start at a random image each page load
  for (var i = images.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = images[i]; images[i] = images[j]; images[j] = tmp;
  }

  var hero = document.querySelector(".hero");
  if (!hero) return;

  var idx = 0;

  function makeSlide(src) {
    var div = document.createElement("div");
    div.className = "hero-slide";
    div.style.backgroundImage = "url(" + src + ")";
    return div;
  }

  // Insert first slide (visible immediately)
  var current = makeSlide(images[idx]);
  hero.insertBefore(current, hero.firstChild);

  // Pre-load next image
  function preload(src) {
    var img = new Image();
    img.src = src;
  }
  preload(images[(idx + 1) % images.length]);

  setInterval(function () {
    var nextIdx = (idx + 1) % images.length;
    var next = makeSlide(images[nextIdx]);

    // Start transparent, insert AFTER current so it sits on top in the stacking order
    next.style.opacity = "0";
    if (current.nextSibling) {
      hero.insertBefore(next, current.nextSibling);
    } else {
      hero.appendChild(next);
    }

    // Force reflow so the transition fires
    next.getBoundingClientRect();

    // Fade in the new slide (on top of the old one)
    next.style.opacity = "1";

    // After transition ends, remove the old slide
    var old = current;
    setTimeout(function () {
      if (old && old.parentNode) old.parentNode.removeChild(old);
    }, 1600);

    current = next;
    idx = nextIdx;

    // Pre-load the one after next
    preload(images[(idx + 1) % images.length]);
  }, 6000);
})();
