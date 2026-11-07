(() => {
  const layer = document.querySelector('.about-trail-layer');
  const sources = [...document.querySelectorAll('#about-photo-sources img')];
  const status = document.querySelector('#about-photo-status');
  const cards = [];
  let pinned = false, photoIndex = -1, wheelDistance = 0, lastSpawn = -Infinity, spawning = false, renderOrder = 0;
  let touchY = null;
  let releasedToIntroduction = false;
  // Seven clockwise stops around the fixed artwork, independent of the cursor.
  const orbitAngles = [-140, -90, -40, 15, 65, 115, 165];
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  function retire(card, immediate = false) {
    if (card.retired) return;
    card.retired = true;
    clearTimeout(card.timer);
    card.animation?.cancel();
    const i = cards.indexOf(card);
    if (i >= 0) cards.splice(i, 1);
    if (immediate || aboutReducedMotion.matches) { card.node.remove(); return; }
    const exit = card.image.animate([
      { opacity: 1, transform: `rotate(${card.angle}deg) scale(1)` },
      { opacity: 0, transform: `translate(${card.dx * .08}px, ${card.dy * .08}px) rotate(${card.angle + 3}deg) scale(.9)` }
    ], { duration: 550, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
    exit.finished.then(() => card.node.remove(), () => card.node.remove());
  }

  async function spawn(direction = 1) {
    const now = performance.now();
    if (spawning || now - lastSpawn < 160) return;
    const index = photoIndex + direction;
    // Stop at each end; reverse gestures revisit the preceding photo, never wrap.
    if (index >= sources.length) {
      releasedToIntroduction = true;
      pinned = false;
      cards.slice().forEach(card => retire(card));
      scrollBy({ top: 100, behavior: 'instant' });
      queueAbout();
      return;
    }
    lastSpawn = now;
    if (index < 0) {
      photoIndex = -1;
      pinned = false;
      cards.slice().forEach(card => retire(card, true));
      scrollTo({ top: 0, behavior: 'instant' });
      queueAbout();
      return;
    }
    const source = sources[index];
    spawning = true;
    try { await source.decode(); } catch { spawning = false; return; }
    spawning = false;
    if (!pinned || document.hidden) return;
    photoIndex = index;
    while (cards.length >= 6) retire(cards[0]);
    // Bound exiting nodes too, even during a fast trackpad gesture.
    while (layer.children.length >= 10) layer.firstElementChild.remove();
    const ratio = source.naturalWidth / source.naturalHeight;
    const maxWidth = Math.min(300, innerWidth * .44);
    const maxHeight = Math.min(360, innerHeight * .4);
    const width = Math.min(maxWidth, maxHeight * ratio), height = width / ratio;
    const center = document.querySelector('.about-figure').getBoundingClientRect();
    const cx = center.left + center.width / 2, cy = center.top + center.height / 2;
    const orbit = orbitAngles[index] * Math.PI / 180;
    const x = clamp(cx + Math.cos(orbit) * innerWidth * .28, width / 2 + 12, innerWidth - width / 2 - 12);
    const y = clamp(cy + Math.sin(orbit) * innerHeight * .26, height / 2 + 88, innerHeight - height / 2 - 16);
    const dx = x - cx, dy = y - cy;
    const angle = [-8, 6, -4, 9, -6, 3, -2][index];
    const node = document.createElement('div');
    node.className = 'about-trail-photo';
    node.dataset.photoIndex = String(index + 1);
    Object.assign(node.style, { left: `${x}px`, top: `${y}px`, width: `${width}px`, height: `${height}px`, zIndex: String(++renderOrder) });
    const image = source.cloneNode();
    image.style.transform = `rotate(${angle}deg)`;
    node.append(image);
    layer.append(node);
    const card = { node, image, angle, dx, dy, animation: null, timer: null, retired: false };
    cards.push(card);
    if (!aboutReducedMotion.matches) {
      card.animation = image.animate([
        { opacity: 0, transform: `translate(${-dx * .22}px, ${-dy * .22}px) rotate(${angle - 5}deg) scale(.65)` },
        { opacity: 1, transform: `rotate(${angle}deg) scale(1.035)`, offset: .72 },
        { opacity: 1, transform: `rotate(${angle}deg) scale(1)` }
      ], { duration: 480, easing: 'cubic-bezier(.22,1,.36,1)' });
    }
    card.timer = setTimeout(() => retire(card), 1900);
    status.textContent = `照片 ${index + 1} / ${sources.length}`;
  }

  window.updateAboutPhotos = reveal => {
    if (releasedToIntroduction && scrollY <= 73) releasedToIntroduction = false;
    // Preserve the photo stage even when a wheel gesture would skip past it.
    if (!releasedToIntroduction && scrollY > 72) {
      scrollTo({ top: 72, behavior: 'instant' });
      queueAbout();
    }
    pinned = reveal >= .999 && !releasedToIntroduction && scrollY <= 73;
    if (!pinned) cards.slice().forEach(card => retire(card, true));
  };
  function step(delta) {
    wheelDistance += delta;
    if (Math.abs(wheelDistance) < 45) return;
    const direction = Math.sign(wheelDistance);
    wheelDistance = 0;
    spawn(direction);
  }
  addEventListener('wheel', event => {
    if (!pinned || event.ctrlKey) return;
    event.preventDefault();
    const factor = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1;
    step(event.deltaY * factor);
  }, { passive: false });
  addEventListener('touchstart', event => {
    touchY = event.touches.length === 1 ? event.touches[0].clientY : null;
  }, { passive: true });
  addEventListener('touchmove', event => {
    if (!pinned || touchY === null || event.touches.length !== 1) return;
    event.preventDefault();
    const y = event.touches[0].clientY;
    step(touchY - y);
    touchY = y;
  }, { passive: false });
  addEventListener('keydown', event => {
    if (!pinned || event.ctrlKey || event.metaKey || event.altKey || /INPUT|TEXTAREA|BUTTON|A/.test(document.activeElement.tagName)) return;
    if (['ArrowDown', 'PageDown', ' ', 'ArrowUp', 'PageUp'].includes(event.key)) {
      event.preventDefault();
      step(['ArrowUp', 'PageUp'].includes(event.key) ? -100 : 100);
    }
  });
  addEventListener('resize', () => { cards.slice().forEach(card => retire(card, true)); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cards.slice().forEach(card => retire(card, true)); layer.replaceChildren(); }
  });
  aboutReducedMotion.addEventListener('change', () => { cards.slice().forEach(card => retire(card, true)); });
  queueAbout();
})();
