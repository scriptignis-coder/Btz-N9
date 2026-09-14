// Mouse parallax on roster photos + the hero photo. Skipped entirely on touch
// devices and when the visitor's OS asks for reduced motion.
(function () {
  try {
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (reduce || !fine) return;

    document.querySelectorAll('.roster-row-photo').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = 'rotateY(' + (x * 7) + 'deg) rotateX(' + (-y * 7) + 'deg)';
      });
      el.addEventListener('mouseleave', function () {
        el.style.transform = '';
      });
    });

    var heroLayer = document.querySelector('.hero-photo-layer');
    var heroImg = heroLayer ? heroLayer.querySelector('img') : null;
    if (heroLayer && heroImg) {
      heroLayer.addEventListener('mousemove', function (e) {
        var r = heroLayer.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        heroImg.style.transform = 'scale(1.06) translate(' + (-x * 14) + 'px,' + (-y * 10) + 'px)';
      });
      heroLayer.addEventListener('mouseleave', function () {
        heroImg.style.transform = '';
      });
    }
  } catch (e) {}
})();
