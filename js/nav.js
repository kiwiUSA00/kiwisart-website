document.addEventListener("DOMContentLoaded", function () {
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".main-nav");
  if (!toggle || !nav) return;
  toggle.addEventListener("click", function () {
    var open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
});

// ── Image & canvas protection ────────────────────────────────────────────────
(function () {
  // Inject CSS: disable browser drag handle and text-selection cursor on media
  var style = document.createElement("style");
  style.textContent =
    "img,canvas{-webkit-user-drag:none;user-drag:none;-webkit-user-select:none;user-select:none;}" +
    "img::selection,canvas::selection{background:transparent;}";
  document.head.appendChild(style);

  // Block right-click context menu on images and canvases
  document.addEventListener("contextmenu", function (e) {
    var tag = e.target && e.target.tagName;
    if (tag === "IMG" || tag === "CANVAS") {
      e.preventDefault();
      return false;
    }
  }, false);

  // Block drag-to-desktop / drag-to-tab saves
  document.addEventListener("dragstart", function (e) {
    var tag = e.target && e.target.tagName;
    if (tag === "IMG" || tag === "CANVAS") {
      e.preventDefault();
      return false;
    }
  }, false);
}());
