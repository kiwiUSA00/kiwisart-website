document.addEventListener("DOMContentLoaded", function () {
  var overlay = document.createElement("div");
  overlay.className = "lightbox";
  overlay.innerHTML =
    '<button class="lightbox-close" aria-label="Close image">&times;</button>' +
    '<img class="lightbox-img" alt="">';
  document.body.appendChild(overlay);

  var lbImg = overlay.querySelector(".lightbox-img");
  var closeBtn = overlay.querySelector(".lightbox-close");

  function openLightbox(src, alt) {
    lbImg.src = src;
    lbImg.alt = alt || "";
    overlay.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    overlay.classList.remove("open");
    lbImg.src = "";
    document.body.style.overflow = "";
  }

  overlay.addEventListener("click", function (e) {
    if (e.target === overlay || e.target === closeBtn) closeLightbox();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeLightbox();
  });

  // Apply to painting detail images and any standalone art-card images not inside a link
  document.querySelectorAll(".painting-img, .art-card img:not(a img), .featured-strip img").forEach(function (img) {
    // Skip images already inside an anchor (they navigate instead)
    if (img.closest("a")) return;
    img.classList.add("zoomable");
    img.addEventListener("click", function (e) {
      e.preventDefault();
      openLightbox(img.currentSrc || img.src, img.alt);
    });
  });
});
