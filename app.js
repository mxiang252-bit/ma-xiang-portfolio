const stage = document.querySelector('#drawing-stage');
const canvas = document.querySelector('#drawing');
const ctx = canvas.getContext('2d');
const pencil = document.querySelector('#pencil');
let width = 0, height = 0, activePointer = null, currentStroke = null;
let strokes = [];

function render() {
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = '#f3f1e9';
  ctx.fillStyle = '#f3f1e9';
  ctx.lineWidth = 2.3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const stroke of strokes) {
    if (stroke.length === 1) {
      ctx.beginPath();
      ctx.arc(stroke[0].x * width, stroke[0].y * height, 1.15, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    ctx.beginPath();
    stroke.forEach((p, i) => {
      const x = p.x * width, y = p.y * height;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.stroke();
  }
}

function stop() {
  const pointer = activePointer;
  activePointer = null;
  currentStroke = null;
  if (pointer !== null && canvas.hasPointerCapture(pointer)) canvas.releasePointerCapture(pointer);
}

function resize() {
  stop();
  const rect = stage.getBoundingClientRect();
  width = rect.width;
  height = rect.height;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  pencil.style.display = 'none';
  render();
}
new ResizeObserver(resize).observe(stage);

function position(event) {
  const rect = stage.getBoundingClientRect();
  return { x: (event.clientX - rect.left) / width, y: (event.clientY - rect.top) / height };
}

function showPencil(event, point) {
  if (event.pointerType === 'touch') return;
  const inside = point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1;
  pencil.style.display = inside ? 'block' : 'none';
  pencil.style.left = point.x * width + 'px';
  pencil.style.top = point.y * height + 'px';
}

function append(point) {
  if (point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) {
    currentStroke = null;
    return;
  }
  if (!currentStroke || currentStroke.length >= 2000) {
    currentStroke = [];
    strokes.push(currentStroke);
    if (strokes.length > 100) strokes.shift();
  }
  currentStroke.push(point);
  render();
}

canvas.addEventListener('pointerdown', event => {
  if (!event.isPrimary || event.button !== 0 || activePointer !== null) return;
  event.preventDefault();
  activePointer = event.pointerId;
  currentStroke = null;
  canvas.setPointerCapture(event.pointerId);
  const point = position(event);
  showPencil(event, point);
  append(point);
});

canvas.addEventListener('pointermove', event => {
  const point = position(event);
  showPencil(event, point);
  if (activePointer !== event.pointerId) return;
  if ((event.buttons & 1) === 0) { stop(); return; }
  append(point);
});
canvas.addEventListener('pointerup', event => { if (event.pointerId === activePointer) stop(); });
canvas.addEventListener('pointercancel', () => { stop(); pencil.style.display = 'none'; });
canvas.addEventListener('lostpointercapture', stop);
canvas.addEventListener('pointerleave', () => { pencil.style.display = 'none'; });
window.addEventListener('blur', () => { stop(); pencil.style.display = 'none'; });

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !document.querySelector('dialog[open]')) {
    stop();
    strokes = [];
    render();
    document.querySelector('#status').textContent = '涂鸦已清除';
  }
});

// The little suggestion bubble rejects labels one by one, like the reference.
const bubble = document.querySelector('#word-bubble');
const bubbleWord = document.querySelector('#bubble-word');
const suggestions = ['founding?', 'product?', 'interaction?', 'digital?', 'just curious?'];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
reducedMotion.addEventListener('change', event => {
  if (event.matches) bubble.getAnimations().forEach(animation => animation.cancel());
});
let suggestionIndex = 0;
let bubbleFlashTimer;
let bubbleBounce;
bubble.addEventListener('click', () => {
  clearTimeout(bubbleFlashTimer);
  bubble.classList.add('is-clicked');
  bubbleFlashTimer = setTimeout(() => bubble.classList.remove('is-clicked'), 500);
  suggestionIndex = (suggestionIndex + 1) % suggestions.length;
  bubbleWord.textContent = suggestions[suggestionIndex];
  if (reducedMotion.matches) return;
  bubbleBounce?.cancel();
  bubble.getAnimations().filter(animation => animation.animationName === 'bubble-in').forEach(animation => animation.cancel());
  bubbleBounce = bubble.animate([
    { transform: 'translateY(0) rotate(0deg)' },
    { transform: 'translateY(-7px) rotate(-4deg)', offset: .35 },
    { transform: 'translateY(2px) rotate(2deg)', offset: .7 },
    { transform: 'translateY(0) rotate(0deg)' }
  ], { duration: 420, easing: 'cubic-bezier(.2,.7,.3,1)' });
});

const artworkDialog = document.querySelector('#artwork-dialog');
const artworkImage = document.querySelector('#artwork-image');
const artworkCaption = document.querySelector('#artwork-caption');
const artworkButtons = [...document.querySelectorAll('.artwork-open')];
let currentArtwork = 0;
let savedBodyOverflow = '';
let artworkAnimation;

function showArtwork(index, animate = false) {
  currentArtwork = (index + artworkButtons.length) % artworkButtons.length;
  const source = artworkButtons[currentArtwork].querySelector('img');
  artworkImage.src = source.src;
  artworkImage.alt = source.alt;
  artworkCaption.textContent = `FIG${currentArtwork + 1}`;
  if (animate && !reducedMotion.matches) {
    artworkAnimation?.cancel();
    artworkAnimation = artworkImage.animate([
      { filter: 'blur(16px)', opacity: .35, transform: 'scale(1.025)' },
      { filter: 'blur(0px)', opacity: 1, transform: 'scale(1)' }
    ], { duration: 420, easing: 'cubic-bezier(.16,.7,.2,1)' });
  }
}

artworkButtons.forEach((button, index) => button.addEventListener('click', () => {
  stop();
  showArtwork(index);
  savedBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  artworkDialog.showModal();
  enterDialog(artworkDialog);
}));
artworkDialog.querySelector('.artwork-close').addEventListener('click', () => closeWithBlur(artworkDialog));
artworkDialog.querySelector('.artwork-previous').addEventListener('click', () => showArtwork(currentArtwork - 1, true));
artworkDialog.querySelector('.artwork-next').addEventListener('click', () => showArtwork(currentArtwork + 1, true));
artworkDialog.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    showArtwork(currentArtwork + (event.key === 'ArrowRight' ? 1 : -1), true);
  }
});
artworkDialog.addEventListener('close', () => { document.body.style.overflow = savedBodyOverflow; });
artworkDialog.addEventListener('click', event => {
  if (event.target === artworkDialog || event.target.classList.contains('artwork-view')) closeWithBlur(artworkDialog);
});

// A brief defocus masks the cut, then brings the destination back into focus.
const sceneVeil = document.querySelector('#scene-veil');
let cutSequence = 0;
let cutAnimation;
async function transitionScene(change) {
  const sequence = ++cutSequence;
  cutAnimation?.cancel();
  if (reducedMotion.matches) {
    sceneVeil.style.display = 'none';
    change();
    return;
  }
  sceneVeil.style.display = 'block';
  try {
    cutAnimation = sceneVeil.animate([
      { backdropFilter: 'blur(0px)', opacity: 0 },
      { backdropFilter: 'blur(15px)', opacity: 1 }
    ], { duration: 170, fill: 'forwards', easing: 'ease-in' });
    await cutAnimation.finished.catch(() => {});
    if (sequence !== cutSequence) return;
    change();
    cutAnimation = sceneVeil.animate([
      { backdropFilter: 'blur(15px)', opacity: 1 },
      { backdropFilter: 'blur(0px)', opacity: 0 }
    ], { duration: reducedMotion.matches ? 0 : 350, fill: 'forwards', easing: 'cubic-bezier(.16,.7,.2,1)' });
    await cutAnimation.finished.catch(() => {});
  } finally {
    if (sequence === cutSequence) {
      sceneVeil.style.display = 'none';
      cutAnimation?.cancel();
    }
  }
}

function enterDialog(dialog) {
  if (reducedMotion.matches) return;
  dialog.animate([
    { filter: 'blur(18px)', opacity: 0, transform: 'translateY(10px) scale(1.015)' },
    { filter: 'blur(0px)', opacity: 1, transform: 'translateY(0) scale(1)' }
  ], { duration: 420, easing: 'cubic-bezier(.16,.7,.2,1)' });
}

async function closeWithBlur(dialog) {
  if (!dialog.open || dialog.dataset.closing) return;
  if (reducedMotion.matches) { dialog.close(); return; }
  dialog.dataset.closing = 'true';
  const animation = dialog.animate([
    { filter: 'blur(0px)', opacity: 1 },
    { filter: 'blur(15px)', opacity: 0 }
  ], { duration: 190, fill: 'forwards', easing: 'ease-in' });
  await animation.finished.catch(() => {});
  dialog.close();
  animation.cancel();
  delete dialog.dataset.closing;
}

document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('cancel', event => {
  event.preventDefault();
  closeWithBlur(dialog);
}));

document.querySelectorAll('a[href="#home"], a[href="#layout-design"]:not(.work-directory a)').forEach(link => link.addEventListener('click', event => {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  const target = document.querySelector(link.hash);
  transitionScene(() => {
    const top = target === document.querySelector('#home') ? 0 : target.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top, behavior: 'instant' });
    if (location.hash !== link.hash) history.pushState(null, '', link.hash);
    queueLayoutFrame();
  });
}));

// Clip a solid black copy of the title to the actual image intersections.
// The uncovered letters retain their glass surface; image colors never tint black text.
const titleBounds = document.querySelector('.layout-title');
const overlapClip = document.querySelector('#layout-image-overlap');
const galleryImages = [...document.querySelectorAll('.layout-gallery img')];
const depthFactors = [.55, .9, .7, .45, .8];
const gallerySection = document.querySelector('#layout-design');
const galleryGrid = document.querySelector('.layout-gallery');
const homeScene = document.querySelector('#home');
const layerAnimations = new Map();
let gallerySceneActive = false;
let titleVisible = false;
let homeSceneFaded = false;
const galleryCards = [...document.querySelectorAll('.layout-figure')].map((figure, index) => {
  // The observer watches a stable layout box. Depth and entrance transforms
  // live on separate children so the scroll position never scrubs the tween.
  const depth = document.createElement('div');
  depth.className = 'artwork-depth';
  const reveal = document.createElement('div');
  reveal.className = 'artwork-reveal';
  reveal.append(...figure.childNodes);
  depth.append(reveal);
  figure.append(depth);
  figure.dataset.reveal = reducedMotion.matches ? 'shown' : 'pending';
  if (!reducedMotion.matches) {
    reveal.classList.add('is-reveal-pending');
    reveal.inert = true;
  }
  const overlap = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  overlap.setAttribute('fill', '#fff');
  return { figure, depth, reveal, image: reveal.querySelector('img'), overlap, decoded: null, factor: depthFactors[index], y: 0, animation: null };
});
let activeReveals = 0;
let layoutFrame = 0;
function updateOverlap() {
  if (!titleVisible && !layerAnimations.has(titleBounds)) {
    if (overlapClip.childElementCount) overlapClip.replaceChildren();
    return;
  }
  const title = titleBounds.getBoundingClientRect();
  const titleOnScreen = title.width && title.height && title.bottom > 0 && title.top < innerHeight;
  for (const card of galleryCards) {
      const { image, figure, overlap } = card;
      if (!titleOnScreen || !image.complete || !image.naturalWidth || !['shown', 'revealing'].includes(figure.dataset.reveal)) {
        overlap.remove();
        continue;
      }
      const opacity = figure.dataset.reveal === 'shown' ? 1 : Number(getComputedStyle(card.reveal).opacity);
      const imageRect = image.getBoundingClientRect();
      const left = Math.max(title.left, imageRect.left);
      const top = Math.max(title.top, imageRect.top);
      const right = Math.min(title.right, imageRect.right);
      const bottom = Math.min(title.bottom, imageRect.bottom);
      if (right <= left || bottom <= top) { overlap.remove(); continue; }
      const attributes = {
        x: (left - title.left) * 1200 / title.width,
        y: (top - title.top) * 240 / title.height,
        width: (right - left) * 1200 / title.width,
        height: (bottom - top) * 240 / title.height,
        opacity
      };
      for (const [name, value] of Object.entries(attributes)) {
        const next = value.toFixed(2);
        if (overlap.getAttribute(name) !== next) overlap.setAttribute(name, next);
      }
      if (overlap.parentNode !== overlapClip) overlapClip.append(overlap);
  }
}

function queueLayoutFrame() {
  if (layoutFrame) return;
  layoutFrame = requestAnimationFrame(() => {
    layoutFrame = 0;
    updateSceneLayers();
    window.updateProductScene?.();
    window.updateBackgroundTitles?.();
    window.updateWorkDirectory?.();
    window.updateEndingScene?.();
    const settling = updateParallax();
    updateOverlap();
    window.updateProductGlass?.();
    const appsSettling = window.updateAppsGlass?.();
    if (activeReveals || settling || appsSettling || layerAnimations.size) queueLayoutFrame();
  });
}
window.addEventListener('scroll', queueLayoutFrame, { passive: true });
window.addEventListener('resize', queueLayoutFrame);
galleryImages.forEach(image => image.addEventListener('load', queueLayoutFrame));
new ResizeObserver(queueLayoutFrame).observe(document.querySelector('.layout-gallery'));
queueLayoutFrame();

function updateParallax() {
  let settling = false;
  const amplitude = innerWidth <= 700 ? 6 : 14;
  const positions = galleryCards.map(card => ({ card, bounds: card.figure.getBoundingClientRect() }));
  for (const { card, bounds } of positions) {
    const visible = bounds.bottom > -80 && bounds.top < innerHeight + 80;
    const progress = Math.max(-1, Math.min(1, (innerHeight / 2 - (bounds.top + bounds.height / 2)) / innerHeight));
    const target = reducedMotion.matches ? 0 : progress * amplitude * card.factor;
    const difference = target - card.y;
    card.y = Math.abs(difference) < .08 || !visible ? target : card.y + difference * .14;
    const offset = `${card.y.toFixed(2)}px`;
    if (card.depth.style.getPropertyValue('--depth-y') !== offset) card.depth.style.setProperty('--depth-y', offset);
    if (visible && Math.abs(target - card.y) >= .08) settling = true;
  }
  return settling;
}

async function revealCard(card, delay = 0) {
  if (card.figure.dataset.reveal !== 'pending') return;
  card.figure.dataset.reveal = 'loading';
  // A lazy image must decode before its entrance; otherwise the frame could
  // animate an empty image box and then pop the artwork in afterwards.
  await prepareCard(card);
  if (reducedMotion.matches || card.figure.dataset.reveal === 'shown') {
    showCardImmediately(card);
    return;
  }
  card.figure.dataset.reveal = 'revealing';
  card.reveal.inert = false;
  card.reveal.classList.remove('is-reveal-pending');
  activeReveals++;
  if (window.scrollY > homeScene.offsetHeight * .24) activateGalleryScene();
  card.animation = card.reveal.animate([
    { opacity: 0, transform: 'translate3d(0, 16px, 0)' },
    { opacity: 1, transform: 'translate3d(0, 0, 0)' }
  ], { duration: 1250, delay, fill: 'both', easing: 'cubic-bezier(.37,0,.63,1)' });
  queueLayoutFrame();
  await card.animation.finished.catch(() => {});
  card.figure.dataset.reveal = 'shown';
  card.animation?.cancel();
  card.animation = null;
  activeReveals--;
  queueLayoutFrame();
}

function showCardImmediately(card) {
  card.figure.dataset.reveal = 'shown';
  card.reveal.classList.remove('is-reveal-pending');
  card.reveal.inert = false;
  card.animation?.finish();
  card.y = 0;
  card.depth.style.setProperty('--depth-y', '0px');
}

// Both scenes share the same fixed background. Only foreground content fades;
// the title waits until the gallery fills the viewport.
function fadeLayer(element, target, duration, delay = 0) {
  const start = Number(getComputedStyle(element).opacity);
  layerAnimations.get(element)?.cancel();
  element.style.opacity = String(start);
  if (reducedMotion.matches || Math.abs(start - target) < .001) {
    element.style.opacity = String(target);
    layerAnimations.delete(element);
    return Promise.resolve();
  }
  const animation = element.animate([{ opacity: start }, { opacity: target }], {
    duration, delay, fill: 'both', easing: 'cubic-bezier(.4,0,.2,1)'
  });
  layerAnimations.set(element, animation);
  return animation.finished.then(() => {
    if (layerAnimations.get(element) !== animation) return;
    element.style.opacity = String(target);
    layerAnimations.delete(element);
    animation.cancel();
  }, () => {});
}

function activateGalleryScene() {
  if (gallerySceneActive) return;
  gallerySceneActive = true;
  gallerySection.dataset.scene = 'ready';
  fadeLayer(galleryGrid, 1, 1150);
}

function deactivateGalleryScene() {
  if (!gallerySceneActive) return;
  gallerySceneActive = false;
  gallerySection.dataset.scene = 'leaving';
  fadeLayer(galleryGrid, 0, 1050);
  homeSceneFaded = false;
  fadeLayer(homeScene, 1, 1100);
}

function updateSceneLayers() {
  const bounds = gallerySection.getBoundingClientRect();
  const canEnter = window.scrollY > homeScene.offsetHeight * .24;
  const worksReady = galleryCards.some(card => ['revealing', 'shown'].includes(card.figure.dataset.reveal));
  if (canEnter && (worksReady || bounds.bottom < innerHeight * .8)) {
    activateGalleryScene();
  } else if (window.scrollY < homeScene.offsetHeight * .18) {
    deactivateGalleryScene();
  }
  // Keep the first scene pinned; fade its content against the single backdrop.
  const shouldFadeHome = gallerySceneActive && window.scrollY >= homeScene.offsetHeight * (homeSceneFaded ? .22 : .35);
  if (shouldFadeHome !== homeSceneFaded) {
    homeSceneFaded = shouldFadeHome;
    fadeLayer(homeScene, homeSceneFaded ? 0 : 1, 1400);
  }

}

if ('IntersectionObserver' in window && !reducedMotion.matches) {
  const prepareObserver = new IntersectionObserver(entries => {
    entries.filter(entry => entry.isIntersecting).forEach(entry => {
      prepareObserver.unobserve(entry.target);
      prepareCard(galleryCards.find(card => card.figure === entry.target));
    });
  }, { rootMargin: '700px 0px', threshold: 0 });
  galleryCards.forEach(card => prepareObserver.observe(card.figure));
  const revealObserver = new IntersectionObserver(entries => {
    const entering = entries.filter(entry => entry.isIntersecting)
      .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
    entering.forEach((entry, index) => {
      const card = galleryCards.find(card => card.figure === entry.target);
      revealObserver.unobserve(entry.target);
      revealCard(card, Math.min(index * 110, 220));
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: .12 });
  galleryCards.forEach(card => revealObserver.observe(card.figure));
} else {
  galleryCards.forEach(showCardImmediately);
}

function prepareCard(card) {
  if (!card.decoded) {
    card.image.loading = 'eager';
    card.decoded = card.image.decode().catch(() => {});
  }
  return card.decoded;
}

reducedMotion.addEventListener('change', event => {
  if (!event.matches) return;
  galleryCards.forEach(showCardImmediately);
  layerAnimations.forEach(animation => animation.finish());
  queueLayoutFrame();
  sceneVeil.getAnimations().forEach(animation => animation.finish());
  document.querySelectorAll('dialog').forEach(dialog => dialog.getAnimations().forEach(animation => animation.finish()));
  artworkAnimation?.finish();
});
