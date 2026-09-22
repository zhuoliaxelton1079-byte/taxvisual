(function () {
  var nodes = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].classList.add('visible');
    }
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].isIntersecting) {
        entries[i].target.classList.add('visible');
        io.unobserve(entries[i].target);
      }
    }
  }, { threshold: 0.18 });

  for (var j = 0; j < nodes.length; j++) {
    io.observe(nodes[j]);
  }
})();
