// One viewport of scroll expands the concentric layers; reverse scroll unwinds them.
const endingSection = document.querySelector('#the-end');
const endingScene = endingSection.querySelector('.ending-scene');
const endingBackdrop = document.querySelector('.ending-backdrop');
const endingRings = [...endingSection.querySelectorAll('.ending-ring')];
const endingLettering = endingSection.querySelector('.ending-lettering');
const ringStarts = [.8, .55, .3, 0];
const ringOpacities = [1, .7, .6, .65];
// Render the circles in the shared backdrop so the section cannot cut them off.
const endingRingLayer = document.createElement('div');
endingRingLayer.className = 'ending-ring-layer';
endingRingLayer.append(endingSection.querySelector('.ending-rings'));
endingBackdrop.append(endingRingLayer);
let endingProgress = -1;

window.updateEndingScene = () => {
  const bounds = endingSection.getBoundingClientRect();
  const raw = Math.max(0, Math.min(1, 1 - bounds.top / innerHeight));
  const progress = reducedMotion.matches ? (raw > 0 ? 1 : 0) : raw;
  const feather = Math.max(250, Math.min(350, innerHeight * .4));
  const featherStart = bounds.top - innerHeight * .3;
  endingRingLayer.style.setProperty('--ring-center-y', `${bounds.top + bounds.height * .51}px`);
  endingRingLayer.style.maskImage = progress >= .999 ? 'none'
    : `linear-gradient(to bottom, transparent ${featherStart}px, #000 ${featherStart + feather}px)`;
  endingRingLayer.style.webkitMaskImage = endingRingLayer.style.maskImage;
  if (Math.abs(progress - endingProgress) < .0001) return;
  endingProgress = progress;
  // Fade the shared viewport behind the final images, without a moving grey seam.
  const backdropProgress = Math.min(1, progress / .7);
  endingBackdrop.style.opacity = String(backdropProgress * backdropProgress * (3 - 2 * backdropProgress));
  endingScene.style.opacity = String(progress);
  // Let the shared red wash establish itself slightly before the circles unfold.
  endingRingLayer.style.opacity = String(Math.max(0, (progress - .08) / .92));
  endingRings.forEach((ring, i) => {
    ring.style.transform = `translate(-50%, -50%) scale(${ringStarts[i] + (1 - ringStarts[i]) * progress})`;
    ring.style.opacity = String(ringOpacities[i] * progress);
  });
  const letteringProgress = Math.max(0, Math.min(1, (progress - .25) / .65));
  endingLettering.style.opacity = String(letteringProgress);
  endingLettering.style.transform = `translate(-50%, -50%) scale(${.88 + .12 * letteringProgress})`;
};
reducedMotion.addEventListener('change', () => { endingProgress = -1; queueLayoutFrame(); });
queueLayoutFrame();
