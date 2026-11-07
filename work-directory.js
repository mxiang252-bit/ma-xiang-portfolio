// Share the title's scroll threshold and fade clock, without a second scroll loop.
const workDirectory = document.querySelector('.work-directory');
const workBrand = document.querySelector('.work-brand');
const directoryLinks = [...workDirectory.querySelectorAll('a')];
let directoryVisible = false;
let directorySlide;
let brandVisible = false;

window.updateWorkDirectory = () => {
  const layoutBounds = gallerySection.getBoundingClientRect();
  const appsBounds = appsSection.getBoundingClientRect();
  const afterHome = titleVisible || layoutBounds.bottom < innerHeight * .65;
  if (afterHome !== brandVisible) {
    brandVisible = afterHome;
    workBrand.inert = !afterHome;
    workBrand.setAttribute('aria-hidden', String(!afterHome));
    fadeLayer(workBrand, afterHome ? 1 : 0, afterHome ? 1100 : 800);
  }
  const wanted = afterHome && appsBounds.bottom >= innerHeight * .65;
  if (wanted !== directoryVisible) {
    directoryVisible = wanted;
    workDirectory.inert = !wanted;
    workDirectory.setAttribute('aria-hidden', String(!wanted));
    const start = getComputedStyle(workDirectory).transform;
    directorySlide?.cancel();
    const end = wanted ? 'translateX(0px)' : 'translateX(-28px)';
    workDirectory.style.transform = end;
    if (!reducedMotion.matches) {
      directorySlide = workDirectory.animate([{ transform: start }, { transform: end }], {
        duration: wanted ? 1100 : 800, easing: 'cubic-bezier(.4,0,.2,1)'
      });
    }
    fadeLayer(workDirectory, wanted ? 1 : 0, wanted ? 1100 : 800);
  }
  const current = appsBounds.top < innerHeight * .65 ? 2
    : productSection.getBoundingClientRect().top < innerHeight * .65 ? 1 : 0;
  directoryLinks.forEach((link, index) => {
    if (index === current) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
};

directoryLinks.forEach(link => {
  const parts = [...link.children];
  const originals = parts.map(part => part.textContent);
  link.setAttribute('aria-label', originals.join(' '));
  parts.forEach(part => part.setAttribute('aria-hidden', 'true'));
  let frame = 0;
  function stop() {
    cancelAnimationFrame(frame);
    parts.forEach((part, i) => { part.textContent = originals[i]; });
  }
  function scramble() {
    stop();
    if (reducedMotion.matches) return;
    const started = performance.now();
    const glyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let tick = -1;
    function draw(now) {
      const progress = Math.min(1, (now - started) / 650);
      const nextTick = Math.floor((now - started) / 45);
      if (nextTick !== tick) {
        tick = nextTick;
        parts.forEach((part, i) => {
          const original = originals[i];
          part.textContent = [...original].map((char, j) =>
            j < progress * original.length || /[\s-]/.test(char) ? char
              : glyphs[Math.floor(Math.random() * glyphs.length)]).join('');
        });
      }
      if (progress < 1) frame = requestAnimationFrame(draw);
      else stop();
    }
    frame = requestAnimationFrame(draw);
  }
  link.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') scramble(); });
  link.addEventListener('focus', scramble);
  link.addEventListener('blur', stop);
  link.addEventListener('click', event => {
    event.preventDefault();
    document.querySelector(link.getAttribute('href')).scrollIntoView({
      behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'start'
    });
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
});
queueLayoutFrame();
