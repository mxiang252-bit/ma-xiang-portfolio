(() => {
  const section = document.querySelector('#about-introduction');
  const backdrop = document.querySelector('.about-intro-backdrop');
  const figure = document.querySelector('.about-figure');
  const words = [];
  const segmenter = typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter('zh-CN', { granularity: 'word' }) : null;
  section.querySelectorAll('p').forEach(paragraph => {
    const text = paragraph.textContent;
    paragraph.setAttribute('aria-label', text);
    const segments = segmenter ? [...segmenter.segment(text)].map(item => item.segment) : [...text];
    const content = document.createDocumentFragment();
    segments.forEach(segment => {
      if (/^\s+$/.test(segment)) { content.append(document.createTextNode(segment)); return; }
      const word = document.createElement('span');
      word.className = 'about-reveal-word';
      word.setAttribute('aria-hidden', 'true');
      word.textContent = segment;
      content.append(word);
      words.push(word);
    });
    paragraph.replaceChildren(content);
  });
  // Observe the stable layout boxes; transforms on their contents never move the trigger.
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const word = entry.target;
      word.style.setProperty('--drop-delay', `${Math.round(entry.boundingClientRect.left / innerWidth * 180)}ms`);
      word.classList.add('is-revealed');
      observer.unobserve(word);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0 });
  words.forEach(word => {
    const ink = document.createElement('span');
    ink.className = 'about-word-ink';
    ink.textContent = word.textContent;
    word.replaceChildren(ink);
    observer.observe(word);
  });
  window.updateAboutIntroduction = () => {
    const bounds = section.getBoundingClientRect();
    const entry = Math.max(0, Math.min(1, 1 - bounds.top / innerHeight));
    const blend = entry * entry * (3 - 2 * entry);
    backdrop.style.opacity = String(blend);
    figure.style.opacity = String(1 - blend);
    figure.setAttribute('aria-hidden', String(blend >= .999));
  };
  aboutReducedMotion.addEventListener('change', queueAbout);
  queueAbout();
})();
