window.createCurvePanel = function ({ seek, replay, resume }) {
  const channel = document.querySelector('#curve-channel'), slider = document.querySelector('#timeline');
  const line = document.querySelector('#curve-line'), dot = document.querySelector('#curve-dot');
  const guide = document.querySelector('#curve-guide'), status = document.querySelector('#curve-status');
  let state = { frames:[], index:0, mode:'idle', reduced:false, frame:{x:0,sx:1,sy:1,phase:50} };
  function value(frame) {
    if (channel.value==='phase') return frame.phase*3.6;
    if (channel.value==='morph') { const p = ToggleMath.clamp(frame.x,0,1); return p*p*(3-2*p); }
    return frame[channel.value];
  }
  function draw() {
    const frames = state.frames.length ? state.frames : [{...state.frame,time:0}];
    const values = frames.map(value), key = channel.value;
    let low = Math.min(...values), high = Math.max(...values);
    if (key==='sx' || key==='sy') { low = Math.min(.8,low); high = Math.max(1.25,high); }
    else if (key!=='phase') { low = Math.min(-.1,low); high = Math.max(1.1,high); }
    else { low = Math.min(0,low)-10; high = Math.max(180,high)+10; }
    const duration = frames.at(-1).time-frames[0].time;
    const x = time => 32+(duration ? (time-frames[0].time)/duration : 0)*212;
    const y = v => 148-(v-low)/(high-low)*128;
    const stride = Math.max(1,Math.ceil(frames.length/220));
    const points = frames.filter((_,i) => i%stride===0 || i===frames.length-1);
    line.setAttribute('d',points.map((f,i) => `${i?'L':'M'}${x(f.time)} ${y(value(f))}`).join(' '));
    const selected = frames[Math.min(state.index,frames.length-1)];
    const cx = x(selected.time), cy = y(value(state.frame));
    dot.setAttribute('cx',cx); dot.setAttribute('cy',cy);
    guide.setAttribute('d',`M32 ${cy} H${cx} V148`);
    document.querySelector('#chart-ymax').textContent = high.toFixed(key==='phase'?0:2);
    document.querySelector('#chart-ymin').textContent = low.toFixed(key==='phase'?0:2);
    slider.value = frames.length>1 ? Math.round(state.index/(frames.length-1)*1000) : 1000;
    const held = state.mode==='pressed' || state.mode==='dragging';
    slider.disabled = held || frames.length<2;
    document.querySelector('#replay').disabled = held;
    document.querySelector('#resume').disabled = state.mode!=='paused' || state.reduced;
    document.querySelector('#timeline-output').textContent = `${Math.round((selected.time-frames[0].time)*1000)} / ${Math.round(duration*1000)} ms`;
    document.querySelector('#curve-value').textContent = key==='phase' ? `${value(state.frame).toFixed(1)}°` : key==='sx'||key==='sy' ? `${value(state.frame).toFixed(3)}×` : `${(value(state.frame)*100).toFixed(1)}%`;
    const names = {idle:'已落定',pressed:'按住',dragging:'拖动中',settling:'回弹中',paused:'已定格',replay:'回放中'};
    document.querySelector('#curve-direction').textContent = names[state.mode];
    document.querySelector('#curve-formula').textContent = '实测轨迹 · 保留超调与反向';
    const message = state.reduced ? '已减少动态效果；支持静态拖动与定格。' : held ? '松手后可定格、重播本次操作。' : state.mode==='paused' ? '已定格。继续回放或直接拖动开关。' : '拖动开关以记录响应，再用游标定格。';
    if (status.textContent!==message) status.textContent = message;
  }
  channel.addEventListener('change',draw);
  slider.addEventListener('input',() => seek(Number(slider.value)/1000));
  document.querySelector('#replay').addEventListener('click',replay);
  document.querySelector('#resume').addEventListener('click',resume);
  return { update(next) { state = next; draw(); } };
};
