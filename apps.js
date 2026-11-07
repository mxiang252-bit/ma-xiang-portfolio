// A composed scatter of six original screens. Entrance tweens run to completion;
// only a small, separate depth layer responds to scrolling.
const appsSection = document.querySelector('#mobile-apps');
const appsTitle = appsSection.querySelector('.apps-title');
const appsMask = document.querySelector('#apps-image-overlap');
let appsTitleVisible = false;
const appsCards = [...appsSection.querySelectorAll('.apps-figure')].map((figure, index) => {
  const overlap = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  overlap.setAttribute('fill', '#fff');
  const reveal = figure.querySelector('.apps-reveal');
  reveal.inert = !reducedMotion.matches;
  figure.dataset.reveal = reducedMotion.matches ? 'shown' : 'pending';
  return { figure, reveal, depth: figure.querySelector('.apps-depth'), image: figure.querySelector('img'), overlap, y: 0, factor: [.7, -.5, .9, -.6, .6, -.8][index], decoded: null, animation: null };
});


window.updateAppsGlass = () => {
  let settling = false;
  const positions = appsCards.map(card => ({ card, bounds: card.figure.getBoundingClientRect() }));
  for (const { card, bounds } of positions) {
    const visible = bounds.bottom > -40 && bounds.top < innerHeight + 40;
    const target = reducedMotion.matches || !visible ? 0 : Math.max(-8, Math.min(8, (innerHeight / 2 - bounds.top - bounds.height / 2) * .012 * card.factor));
    const next = reducedMotion.matches ? 0 : card.y + (target - card.y) * .15;
    if (Math.abs(next - card.y) > .02) {
      card.y = next;
      card.depth.style.setProperty('--apps-depth', `${next.toFixed(2)}px`);
      settling = true;
    }
    if (Math.abs(target - card.y) > .15) settling = true;
  }
  if (!appsTitleVisible && !layerAnimations.has(appsTitle)) {
    if (appsMask.childElementCount) appsMask.replaceChildren();
    return settling;
  }
  const title = appsTitle.getBoundingClientRect();
  for (const { image, reveal, overlap } of appsCards) {
    const bounds = image.getBoundingClientRect();
    const left = Math.max(title.left, bounds.left);
    const right = Math.min(title.right, bounds.right);
    const top = Math.max(title.top, bounds.top);
    const bottom = Math.min(title.bottom, bounds.bottom);
    if (!image.naturalWidth || !title.width || !title.height || right <= left || bottom <= top) { overlap.remove(); continue; }
    const attributes = {
      x: (left - title.left) * 1200 / title.width,
      y: (top - title.top) * 240 / title.height,
      width: (right - left) * 1200 / title.width,
      height: (bottom - top) * 240 / title.height,
      opacity: Number(getComputedStyle(reveal).opacity)
    };
    for (const [key, value] of Object.entries(attributes)) {
      const next = value.toFixed(3);
      if (overlap.getAttribute(key) !== next) overlap.setAttribute(key, next);
    }
    if (overlap.parentNode !== appsMask) appsMask.append(overlap);
  }
  return settling;
};

function prepareAppCard(card) {
  if (!card.decoded) {
    card.image.loading = 'eager';
    card.decoded = card.image.decode().catch(() => {});
  }
  return card.decoded;
}
function showAppCard(card) {
  card.animation?.cancel();
  card.animation = null;
  card.figure.dataset.reveal = 'shown';
  card.reveal.style.opacity = '1';
  card.reveal.style.transform = 'none';
  card.reveal.inert = false;
}
async function revealAppCard(card, delay) {
  if (card.figure.dataset.reveal !== 'pending') return;
  card.figure.dataset.reveal = 'preparing';
  await prepareAppCard(card);
  if (reducedMotion.matches) { showAppCard(card); return; }
  card.figure.dataset.reveal = 'revealing';
  card.reveal.inert = false;
  activeReveals++;
  const animation = card.reveal.animate([
    { opacity: 0, transform: 'translate3d(0,16px,0)' },
    { opacity: 1, transform: 'translate3d(0,0,0)' }
  ], { duration: 1250, delay, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' });
  card.animation = animation;
  queueLayoutFrame();
  try { await animation.finished; } catch {}
  if (card.animation === animation) showAppCard(card);
  activeReveals--;
  queueLayoutFrame();
}
if ('IntersectionObserver' in window && !reducedMotion.matches) {
  const prepare = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    prepare.unobserve(entry.target);
    prepareAppCard(appsCards.find(card => card.figure === entry.target));
  }), { rootMargin: '700px 0px' });
  const reveal = new IntersectionObserver(entries => entries.filter(entry => entry.isIntersecting).forEach((entry, index) => {
    reveal.unobserve(entry.target);
    revealAppCard(appsCards.find(card => card.figure === entry.target), Math.min(index * 100, 200));
  }), { rootMargin: '0px 0px -8%', threshold: .12 });
  appsCards.forEach(card => { prepare.observe(card.figure); reveal.observe(card.figure); });
} else appsCards.forEach(showAppCard);
appsCards.forEach(({ image }) => image.addEventListener('load', queueLayoutFrame));
new ResizeObserver(queueLayoutFrame).observe(appsSection);
reducedMotion.addEventListener('change', event => {
  if (event.matches) appsCards.forEach(showAppCard);
  queueLayoutFrame();
});
// Motion accents are anchored to the gallery without changing the image grid.
const appsGallery = appsSection.querySelector('.apps-gallery');
const appsLikes = appsGallery.querySelector('.apps-likes');
const appsLoading = appsGallery.querySelector('.apps-loading');
const appsAccentAnimations = new Map();
const appsAccentsInView = new Set();
function positionAppsAccents() {
  const mobile = innerWidth <= 700;
  const second = appsCards[1].figure;
  const third = appsCards[2].figure;
  const sixth = appsCards[5].figure;
  const width = appsGallery.clientWidth;
  const first = appsCards[0].figure;
  appsLikes.style.left = `${mobile ? first.offsetLeft + first.offsetWidth + 12 : width * .36}px`;
  appsLikes.style.top = `${mobile ? (second.offsetTop + second.offsetHeight + third.offsetTop) / 2 : second.offsetTop + second.offsetHeight + 90}px`;
  appsLoading.style.left = `${width * (mobile ? .84 : .79)}px`;
  appsLoading.style.top = `${mobile ? third.offsetTop + third.offsetHeight * .48 : (third.offsetTop + third.offsetHeight + sixth.offsetTop) / 2}px`;
}
function playAppsAccent(button) {
  const target = button.querySelector('.apps-loading-fill');
  appsAccentAnimations.get(button)?.cancel();
  button.dataset.plays = String(Number(button.dataset.plays || 0) + 1);
  if (reducedMotion.matches) {
    target.style.opacity = '1';
    target.style.transform = 'none';
    target.style.clipPath = 'inset(0)';
    appsAccentAnimations.delete(button);
    return;
  }
  target.style.clipPath = 'inset(0 100% 0 0)';
  const animation = target.animate([
    { clipPath: 'inset(0 100% 0 0)', offset: 0 },
    { clipPath: 'inset(0 72% 0 0)', offset: .22 },
    { clipPath: 'inset(0 72% 0 0)', offset: .35 },
    { clipPath: 'inset(0 38% 0 0)', offset: .60 },
    { clipPath: 'inset(0 19% 0 0)', offset: .78 },
    { clipPath: 'inset(0 0% 0 0)', offset: 1 }
  ], { duration: 3200, delay: 250, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' });
  appsAccentAnimations.set(button, animation);
  animation.finished.then(() => {
    if (appsAccentAnimations.get(button) !== animation) return;
    target.style.clipPath = 'inset(0)';
    appsAccentAnimations.delete(button);
    animation.cancel();
  }, () => {});
}
const appsAccentObserver = new IntersectionObserver(entries => entries.forEach(entry => {
  if (entry.isIntersecting && entry.intersectionRatio >= .35 && !appsAccentsInView.has(entry.target)) {
    appsAccentsInView.add(entry.target);
    if (!document.hidden) playAppsAccent(entry.target);
  } else if (!entry.isIntersecting) {
    appsAccentsInView.delete(entry.target);
    appsAccentAnimations.get(entry.target)?.cancel();
    appsAccentAnimations.delete(entry.target);
  }
}), { threshold: [0, .35] });
[appsLoading].forEach(button => {
  appsAccentObserver.observe(button);
  button.addEventListener('click', () => playAppsAccent(button));
});
document.addEventListener('visibilitychange', () => {
  appsAccentAnimations.forEach(animation => document.hidden ? animation.pause() : animation.play());
  if (!document.hidden) appsAccentsInView.forEach(button => {
    if (!appsAccentAnimations.has(button) && !button.dataset.plays) playAppsAccent(button);
  });
});
reducedMotion.addEventListener('change', event => {
  if (event.matches) playAppsAccent(appsLoading);
});
new ResizeObserver(positionAppsAccents).observe(appsGallery);
positionAppsAccents();
queueLayoutFrame();
