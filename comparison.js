(() => {
  const box = document.querySelector('#comparison'), slider = document.querySelector('#reveal');
  const original = document.querySelector('#reference'), local = document.querySelector('#local');
  const divider = document.querySelector('.divider'), view = document.querySelector('#view'), zoom = document.querySelector('#zoom');
  let active = null;
  function reveal(value) {
    const percent = Math.max(0, Math.min(100, Number(value)));
    slider.value = percent; original.style.clipPath = `inset(0 ${100 - percent}% 0 0)`;
    divider.style.left = percent + '%'; divider.hidden = percent === 0 || percent === 100;
    document.querySelector('#percent').textContent = Math.round(percent) + '%';
    document.querySelector('.tag.original').hidden = percent === 0;
    document.querySelector('.tag.current').hidden = percent === 100;
  }
  function resize() {
    const detail = view.value === 'detail', scale = Number(zoom.value);
    box.style.width = 440 * scale + 'px'; box.style.height = (detail ? 203 : 453) * scale + 'px';
    original.src = `evidence/light-reference-${detail ? 'detail' : 'aligned'}.png`;
    local.src = `evidence/light-local-${detail ? 'detail' : 'aligned'}.png`;
  }
  function move(e) {
    const rect = box.getBoundingClientRect(); reveal((e.clientX - rect.left) / rect.width * 100);
  }
  box.addEventListener('pointerdown', e => {
    if (!e.isPrimary || e.button !== 0 || active !== null) return;
    active = e.pointerId; box.setPointerCapture(active); move(e);
  });
  box.addEventListener('pointermove', e => { if (e.pointerId === active) move(e); });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) box.addEventListener(type, e => {
    if (e.pointerId !== active) return;
    active = null; if (box.hasPointerCapture(e.pointerId)) box.releasePointerCapture(e.pointerId);
  });
  slider.addEventListener('input', () => reveal(slider.value));
  for (const [id, percent] of [['original',100],['split',50],['current',0]]) document.getElementById(id).addEventListener('click', () => reveal(percent));
  view.addEventListener('change', resize); zoom.addEventListener('change', resize);
  resize(); reveal(50);
})();
