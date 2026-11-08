window.createCurvePanel = function ({ seek, replay, resume }) {
  const channel = document.querySelector('#curve-channel');
  const slider = document.querySelector('#timeline');
  const line = document.querySelector('#curve-line');
  const dot = document.querySelector('#curve-dot');
  const guide = document.querySelector('#curve-guide');
  const continueButton = document.querySelector('#resume');
  const status = document.querySelector('#curve-status');
  let state = { progress: 1, paused: false, day: 0, power: 4, duration: 680, reduced: false };
  let lineKey = '';
  function draw() {
    const value = t => ToggleMath.curves(t, state.power)[channel.value];
    const key = `${channel.value}:${state.power}`;
    if (key !== lineKey) {
      line.setAttribute('d', Array.from({ length: 101 }, (_, i) => `${i ? 'L' : 'M'}${32+i*2.12} ${148-value(i/100)*128}`).join(' '));
      lineKey = key;
    }
    const t = state.progress, y = value(t), x = 32+t*212, cy = 148-y*128;
    dot.setAttribute('cx', x); dot.setAttribute('cy', cy);
    guide.setAttribute('d', `M32 ${cy} H${x} V148`);
    slider.value = Math.round(t*1000);
    document.querySelector('#timeline-output').textContent = `${Math.round(t*state.duration)} / ${state.duration} ms`;
    document.querySelector('#curve-value').textContent = `完成 ${Math.round(y*100)}%`;
    document.querySelector('#curve-direction').textContent = state.day ? '夜间 → 日间' : '日间 → 夜间';
    document.querySelector('#curve-formula').textContent = channel.value === 'morph' ? 'f(t) = 3t² − 2t³' : `f(t) = 1 − (1 − t)^${state.power}`;
    continueButton.disabled = !state.paused || t >= 1 || state.reduced;
    const message = state.reduced ? '系统已减少动态效果；游标仍可静态取样。' : state.paused ? '已定格。继续播放或点击开关反向。' : '拖动游标可定格；点击开关可反向。';
    // Keep the live region silent until its meaning actually changes.
    if (status.textContent !== message) status.textContent = message;
  }
  channel.addEventListener('change', draw);
  slider.addEventListener('input', () => seek(Number(slider.value)/1000));
  document.querySelector('#replay').addEventListener('click', replay);
  continueButton.addEventListener('click', resume);
  return { update(next) { state = { ...state, ...next }; draw(); } };
};
