// Seamless automatic strip; original and repeated cards share the same lightbox.
const productSection = document.querySelector('#product-design');
const productScene = productSection.querySelector('.product-scene');
const productTitle = productSection.querySelector('.product-title');
const productViewport = productSection.querySelector('.product-viewport');
const productTrack = productSection.querySelector('.product-track');
const productMask = document.querySelector('#product-image-overlap');
const originalProductFigures = [...productTrack.children];
originalProductFigures.forEach(figure => {
  const copy = figure.cloneNode(true);
  copy.dataset.loopCopy = '';
  copy.setAttribute('aria-hidden', 'true');
  const button = copy.querySelector('button');
  button.tabIndex = -1;
  button.addEventListener('click', () => figure.querySelector('button').click());
  productTrack.append(copy);
});
const productCards = [...productTrack.children].map(figure => {
  const overlap = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  overlap.setAttribute('fill', '#fff');
  return { figure, image: figure.querySelector('img'), overlap };
});
let productActive = false;
let productTitleVisible = false;
productScene.inert = true;
window.updateProductScene = () => {
  const bounds = productScene.getBoundingClientRect();
  const active = bounds.bottom > 0 && bounds.top < innerHeight * (productActive ? .94 : .82);
  if (active !== productActive) {
    productActive = active;
    productScene.inert = !active;
    if (active) productCards.forEach(({ image }) => { image.loading = 'eager'; });
    fadeLayer(productScene, active ? 1 : 0, active ? 1000 : 800);
    scheduleProductLoop();
  }

};
window.updateProductGlass = () => {
  if (!productTitleVisible && !layerAnimations.has(productTitle)) {
    if (productMask.childElementCount) productMask.replaceChildren();
    return;
  }
  const title = productTitle.getBoundingClientRect();
  const viewport = productViewport.getBoundingClientRect();
  productMask.style.opacity = getComputedStyle(productScene).opacity;
  for (const { image, overlap } of productCards) {
    if (!image.complete || !image.naturalWidth) { overlap.remove(); continue; }
    const bounds = image.getBoundingClientRect();
    const left = Math.max(title.left, bounds.left, viewport.left);
    const right = Math.min(title.right, bounds.right, viewport.right);
    const top = Math.max(title.top, bounds.top, viewport.top);
    const bottom = Math.min(title.bottom, bounds.bottom, viewport.bottom);
    if (!title.width || !title.height || right <= left || bottom <= top) { overlap.remove(); continue; }
    const attributes = {
      x: (left - title.left) * 1200 / title.width,
      y: (top - title.top) * 240 / title.height,
      width: (right - left) * 1200 / title.width,
      height: (bottom - top) * 240 / title.height
    };
    for (const [name, value] of Object.entries(attributes)) {
      const next = value.toFixed(2);
      if (overlap.getAttribute(name) !== next) overlap.setAttribute(name, next);
    }
    if (overlap.parentNode !== productMask) productMask.append(overlap);
  }
};
let productLoopFrame = 0;
let productLastTime = 0;
let productOffset = 0;
let productLoopWidth = 0;
let productPointer = null;
let suppressProductClickUntil = 0;
function measureProductLoop() {
  productLoopWidth = productTrack.children[originalProductFigures.length].offsetLeft - originalProductFigures[0].offsetLeft;
  if (productLoopWidth) productOffset %= productLoopWidth;
  productTrack.style.transform = `translate3d(${-productOffset}px, 0, 0)`;
  queueLayoutFrame();
}
function canPlayProductLoop() {
  return productActive && !document.hidden && !reducedMotion.matches && !artworkDialog.open && !productPointer;
}
function scheduleProductLoop() {
  if (productLoopFrame || !canPlayProductLoop()) return;
  productLastTime = 0;
  productLoopFrame = requestAnimationFrame(advanceProductLoop);
}
function advanceProductLoop(time) {
  productLoopFrame = 0;
  if (!canPlayProductLoop()) return;
  const elapsed = productLastTime ? Math.min(time - productLastTime, 64) : 0;
  productLastTime = time;
  if (productLoopWidth) {
    productOffset = (productOffset + elapsed * .04) % productLoopWidth;
    productTrack.style.transform = `translate3d(${-productOffset}px, 0, 0)`;
    window.updateProductGlass();
  }
  productLoopFrame = requestAnimationFrame(advanceProductLoop);
}
// Holding pauses the target. A drag/swipe cannot move the strip or accidentally
// open a picture. Vertical touch scrolling still belongs to the page.
productViewport.addEventListener('pointerdown', event => {
  if (!event.isPrimary || event.button !== 0) return;
  productPointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
});
window.addEventListener('pointermove', event => {
  if (productPointer?.id === event.pointerId && Math.hypot(event.clientX - productPointer.x, event.clientY - productPointer.y) > 8) {
    suppressProductClickUntil = performance.now() + 350;
  }
}, { passive: true });
function releaseProductPointer(event) {
  if (productPointer?.id !== event.pointerId) return;
  productPointer = null;
  scheduleProductLoop();
}
window.addEventListener('pointerup', releaseProductPointer);
window.addEventListener('pointercancel', releaseProductPointer);
window.addEventListener('blur', () => { productPointer = null; });
productViewport.addEventListener('dragstart', event => event.preventDefault());
productViewport.addEventListener('click', event => {
  if (performance.now() < suppressProductClickUntil) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}, true);
productViewport.addEventListener('focusout', () => requestAnimationFrame(scheduleProductLoop));
document.addEventListener('visibilitychange', scheduleProductLoop);
window.addEventListener('focus', scheduleProductLoop);
new MutationObserver(scheduleProductLoop).observe(artworkDialog, { attributes: true, attributeFilter: ['open'] });
new ResizeObserver(measureProductLoop).observe(productTrack);
productCards.forEach(({ image }) => image.addEventListener('load', measureProductLoop));
reducedMotion.addEventListener('change', scheduleProductLoop);
measureProductLoop();
queueLayoutFrame();
