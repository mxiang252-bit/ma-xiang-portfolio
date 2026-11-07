const aboutReducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const aboutVeil = document.querySelector('.about-black-veil');
const aboutWall = document.querySelector('.about-photo-wall img');
const aboutHint = document.querySelector('.about-scroll-prompt');
const aboutJourney = document.querySelector('.about-journey');
let aboutFrame = 0;

function updateAbout() {
  aboutFrame = 0;
  // A short reveal, while the foreground artwork stays anchored to the viewport.
  const reveal = Math.min(1, Math.max(0, scrollY / 72));
  aboutVeil.style.opacity = String(1 - reveal * reveal * (3 - 2 * reveal));
  aboutWall.style.transform = 'translate3d(0, 0, 0)';
  window.updateAboutPhotos?.(reveal);
  window.updateAboutIntroduction?.();
  aboutHint.style.opacity = String(.65 * (1 - reveal));
  aboutHint.inert = reveal === 1;
  aboutHint.setAttribute('aria-hidden', String(reveal === 1));
}
function queueAbout() {
  if (!aboutFrame) aboutFrame = requestAnimationFrame(updateAbout);
}
addEventListener('scroll', queueAbout, { passive: true });
addEventListener('resize', queueAbout);
addEventListener('pageshow', queueAbout);
aboutWall.addEventListener('load', queueAbout);
aboutReducedMotion.addEventListener('change', queueAbout);
aboutHint.addEventListener('click', event => {
  event.preventDefault();
  scrollTo({ top: 120, behavior: aboutReducedMotion.matches ? 'instant' : 'smooth' });
});
queueAbout();
