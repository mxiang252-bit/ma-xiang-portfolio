// A small, self-contained color study attached to FIG18, independent of images.
const appsPicker = document.createElement('div');
appsPicker.className = 'apps-picker';
appsPicker.setAttribute('role', 'group');
appsPicker.setAttribute('aria-label', '互动配色选择器，方向键切换色点，回车选色');
appsCards[4].reveal.append(appsPicker);
const pickerNames = ['红色', '橙色', '黄色', '黄绿色', '绿色', '青绿色', '青色', '天蓝色', '蓝色', '紫色', '品红色', '玫红色'];
const pickerDots = [];
for (const ring of [{ count: 12, radius: 40, light: 60 }, { count: 6, radius: 20, light: 85 }, { count: 1, radius: 0, light: 100 }]) {
  for (let index = 0; index < ring.count; index++) {
    const hue = index * 360 / ring.count;
    const angle = (hue - 90) * Math.PI / 180;
    const color = ring.radius ? `hsl(${hue} ${ring.light === 85 ? 60 : 90}% ${ring.light}%)` : '#fff';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'apps-color-dot';
    button.style.setProperty('--dot-color', color);
    button.setAttribute('aria-label', `选择${ring.radius ? (ring.light === 85 ? '浅' : '') + pickerNames[Math.round(hue / 30)] : '白色'}`);
    button.setAttribute('aria-pressed', 'false');
    button.tabIndex = ring.radius ? -1 : 0;
    const dot = { button, color, baseX: Math.cos(angle) * ring.radius, baseY: Math.sin(angle) * ring.radius, x: 0, y: 0, vx: 0, vy: 0 };
    pickerDots.push(dot);
    button.addEventListener('click', () => selectPickerDot(dot));
    appsPicker.append(button);
  }
}
let pickerFrame = 0;
let pickerLastTime = 0;
let pickerPointer = null;
let pickerScale = 1;
let pickerSelected = null;
function selectPickerDot(dot) {
  pickerSelected = pickerSelected === dot ? null : dot;
  appsPicker.classList.toggle('is-selected', !!pickerSelected);
  appsPicker.dataset.selectedColor = pickerSelected?.color || '';
  appsPicker.style.setProperty('--picker-color', pickerSelected?.color || 'transparent');
  pickerDots.forEach(item => {
    item.button.setAttribute('aria-pressed', String(item === pickerSelected));
    item.button.tabIndex = item === dot ? 0 : -1;
  });
}
function paintPickerDot(dot) {
  dot.button.style.transform = `translate3d(${(dot.baseX * pickerScale + dot.x).toFixed(3)}px, ${(dot.baseY * pickerScale + dot.y).toFixed(3)}px, 0)`;
}
function resetPickerDots() {
  cancelAnimationFrame(pickerFrame);
  pickerFrame = 0;
  pickerLastTime = 0;
  pickerPointer = null;
  pickerScale = appsPicker.clientWidth / 140;
  pickerDots.forEach(dot => { dot.x = dot.y = dot.vx = dot.vy = 0; paintPickerDot(dot); });
}
function queuePickerSpring() {
  if (pickerFrame || reducedMotion.matches || document.hidden) return;
  pickerLastTime = 0;
  pickerFrame = requestAnimationFrame(stepPickerSpring);
}
function stepPickerSpring(time) {
  pickerFrame = 0;
  const dt = Math.min((time - pickerLastTime) / 1000 || 1 / 60, .032);
  pickerLastTime = time;
  let settling = false;
  for (const dot of pickerDots) {
    let tx = 0, ty = 0;
    if (pickerPointer) {
      const dx = dot.baseX * pickerScale - pickerPointer.x;
      const dy = dot.baseY * pickerScale - pickerPointer.y;
      const distance = Math.hypot(dx, dy);
      const force = Math.max(0, 1 - distance / (80 * pickerScale)) * 5 * pickerScale;
      tx = distance > .01 ? dx / distance * force : 0;
      ty = distance > .01 ? dy / distance * force : -force;
    }
    dot.vx += ((tx - dot.x) * 180 - dot.vx * 22) * dt;
    dot.vy += ((ty - dot.y) * 180 - dot.vy * 22) * dt;
    dot.x += dot.vx * dt;
    dot.y += dot.vy * dt;
    if (Math.abs(tx - dot.x) + Math.abs(ty - dot.y) + Math.abs(dot.vx) + Math.abs(dot.vy) > .025) settling = true;
    else { dot.x = tx; dot.y = ty; dot.vx = dot.vy = 0; }
    paintPickerDot(dot);
  }
  if (settling) pickerFrame = requestAnimationFrame(stepPickerSpring);
}
appsPicker.addEventListener('pointermove', event => {
  if (reducedMotion.matches) return;
  const bounds = appsPicker.getBoundingClientRect();
  pickerPointer = { x: event.clientX - bounds.left - bounds.width / 2, y: event.clientY - bounds.top - bounds.height / 2 };
  queuePickerSpring();
});
appsPicker.addEventListener('pointerleave', () => { pickerPointer = null; queuePickerSpring(); });
appsPicker.addEventListener('pointerup', event => { if (event.pointerType !== 'mouse') { pickerPointer = null; queuePickerSpring(); } });
appsPicker.addEventListener('pointercancel', () => { pickerPointer = null; queuePickerSpring(); });
appsPicker.addEventListener('keydown', event => {
  const index = pickerDots.findIndex(dot => dot.button === event.target);
  if (index < 0) return;
  const direction = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
  if (!direction && event.key !== 'Home' && event.key !== 'End') return;
  event.preventDefault();
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? pickerDots.length - 1 : (index + direction + pickerDots.length) % pickerDots.length;
  pickerDots.forEach((dot, i) => { dot.button.tabIndex = i === next ? 0 : -1; });
  pickerDots[next].button.focus({ preventScroll: true });
});
new ResizeObserver(resetPickerDots).observe(appsPicker);
document.addEventListener('visibilitychange', () => { if (document.hidden) resetPickerDots(); });
reducedMotion.addEventListener('change', resetPickerDots);
resetPickerDots();
