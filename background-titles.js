// One owner for all title transitions, including reverse and skipped sections.
const backgroundTitles = [titleBounds, productTitle, appsTitle];
let activeTitleIndex = -1;

window.updateBackgroundTitles = () => {
  const layout = gallerySection.getBoundingClientRect();
  const product = productSection.getBoundingClientRect();
  const apps = appsSection.getBoundingClientRect();
  const line = innerHeight * .65;
  const buffer = Math.min(40, innerHeight * .045);
  let next = -1;
  if (gallerySceneActive) {
    if (apps.top <= line && apps.bottom >= line) next = 2;
    else if (product.top <= line && product.bottom >= line) next = 1;
    else if (layout.top <= 8 && layout.bottom >= line) next = 0;
  }

  // Keep the current section through a small dead band at each boundary.
  if (activeTitleIndex === 0 && next === -1 && layout.top <= 40 && layout.bottom >= line - buffer) next = 0;
  if (activeTitleIndex === 2 && next === -1 && apps.bottom >= line - buffer && apps.top <= line) next = 2;
  if (activeTitleIndex >= 0 && next === activeTitleIndex + 1) {
    const entering = next === 1 ? product : apps;
    if (entering.top > line - buffer) next = activeTitleIndex;
  }
  if (next >= 0 && next === activeTitleIndex - 1) {
    const leaving = activeTitleIndex === 1 ? product : apps;
    if (leaving.top < line + buffer) next = activeTitleIndex;
  }
  if (next === activeTitleIndex) return;
  activeTitleIndex = next;
  titleVisible = next === 0;
  productTitleVisible = next === 1;
  appsTitleVisible = next === 2;

  const hasOutgoing = backgroundTitles.some((element, index) =>
    index !== next && Number(getComputedStyle(element).opacity) > .02);
  backgroundTitles.forEach((element, index) => {
    const visible = index === next;
    element.dataset.visibility = visible ? 'visible' : 'hidden';
    // A 450ms lead-out within a 600ms fade leaves a 150ms crossfade, no empty hold.
    fadeLayer(element, visible ? 1 : 0, 600, visible && hasOutgoing ? 450 : 0);
  });
};
queueLayoutFrame();
