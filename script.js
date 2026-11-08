(() => {
  'use strict';
  const { clamp, mix } = ToggleMath;
  const stage = document.querySelector('.stage'), button = document.querySelector('#theme-switch');
  const thumb = document.querySelector('.thumb'), canvas = document.querySelector('.particles');
  const lighting = ToggleLighting.create(document.querySelector('.lighting'));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let settings = ToggleSettings.values;
  const engine = ToggleMotion.createMotion(settings), particles = createParticles(canvas);
  let frameId = 0, lastTime = 0, origin = performance.now();
  let frames = [{...engine.snapshot(),time:0,clock:origin}], selected = 0, playback = null;
  const chart = createCurvePanel({ seek,replay,resume });
  function rgb(hex) { return hex.match(/[a-f\d]{2}/gi).map(v => parseInt(v,16)); }
  function startRecord() {
    const mode = engine.snapshot().mode;
    if (mode==='idle' || mode==='paused' || playback) {
      origin = performance.now(); frames = [{...engine.snapshot(),time:0,clock:origin}]; selected = 0;
    }
    playback = null;
  }
  function toggle() { startRecord(); engine.toggle(); wake(); }
  const gesture = bindToggleGesture(button, {
    begin() { startRecord(); const x = engine.snapshot().x; engine.begin(); return x; },
    move(x,y) { engine.drag(x,y); },
    end(cancel) { engine.release(cancel); },
    toggle,wake,getTravel:() => button.clientWidth*.483,
  });
  function seek(t) {
    gesture.cancel(); playback = null;
    selected = Math.round(t*(frames.length-1)); engine.restore(frames[selected]); wake();
  }
  function replay() {
    gesture.cancel();
    if (frames.length<2) { startRecord(); engine.replay(); wake(); return; }
    selected = 0; engine.restore(frames[0]); resume();
  }
  function resume() {
    if (reduced.matches) {
      selected = frames.length-1; engine.restore(frames[selected]); engine.snap(); wake(); return;
    }
    playback = { start:performance.now(), time:frames[selected].time }; wake();
  }
  function advancePlayback(now) {
    const time = playback.time+(now-playback.start)/1000;
    while (selected<frames.length-1 && frames[selected+1].time<=time) selected++;
    engine.restore(frames[selected]);
    if (selected===frames.length-1) {
      playback = null;
      if (frames[selected].mode==='idle') engine.snap();
      else { origin = now-frames[selected].time*1000; engine.resume(); }
    }
  }
  function resize() {
    // Transform deformation must not alter the canvas backing-buffer scale.
    const size = thumb.clientWidth;
    particles.resize(size,devicePixelRatio||1);
    lighting.resize(size,devicePixelRatio||1);
    stage.style.setProperty('--radius',settings.radius*size/180+'px');
    stage.style.setProperty('--bevel',settings.bevel*size/180+'px');
    stage.style.setProperty('--track-radius',(settings.radius+9)*size/180+'px');
    wake();
  }
  function applySettings() {
    settings = ToggleSettings.values; engine.configure(settings);
    stage.style.setProperty('--width',settings.width+'px');
    stage.style.setProperty('--glass',settings.glass);
    stage.style.setProperty('--blur',settings.blur+'px');
    resize();
  }
  function paint(now) {
    const f = engine.snapshot(), p = clamp(f.x,0,1);
    const mode = playback?'replay':f.mode;
    const night = rgb(settings.nightColor), light = rgb(settings.dayColor);
    const tone = p**.61, surface = p**.48;
    stage.style.setProperty('--day',tone);
    stage.style.setProperty('--surface',surface);
    stage.style.setProperty('--track-shade',.5*(1-surface)**2);
    stage.style.color = tone<.25?'#9899a1':tone<.49?'#ffffff':tone<.75?'#000000':'#686868';
    const white=[255,231,190];
    let warmth=clamp(p<.5?(p-.3)/.2:(p-.5)/.5,0,1);
    warmth=warmth*warmth*(3-2*warmth);
    const accent=p<.5?night.map((v,i)=>mix(v,white[i],warmth)):white.map((v,i)=>mix(v,light[i],warmth));
    stage.style.setProperty('--accent',accent.map(Math.round).join(','));
    lighting.draw(f,settings,accent,p);
    const travel = button.clientWidth*.483;
    thumb.style.transform = `translate(${f.x*travel}px,${f.y*travel}px) scale(${f.sx},${f.sy})`;
    const clock = mode==='paused'||mode==='replay'?frames[selected].clock:now;
    particles.draw(f.x,clock,settings,reduced.matches);
    button.setAttribute('aria-checked',String(!f.target));
    Object.assign(button.dataset,{state:mode,animating:String(!['idle','paused'].includes(mode)),paused:String(mode==='paused'),progress:p.toFixed(5),x:f.x.toFixed(6),sx:f.sx.toFixed(6),sy:f.sy.toFixed(6),phase:f.phase.toFixed(6),travel:String(travel)});
    const label = mode==='dragging'||mode==='pressed'?'拖动中':f.target?'日间':'夜间';
    if (document.querySelector('#theme-label').textContent!==label) document.querySelector('#theme-label').textContent=label;
    chart.update({frames,index:selected,mode,frame:f,reduced:reduced.matches});
  }
  function tick(now) {
    frameId = 0;
    const delta = lastTime?Math.min((now-lastTime)/1000,.05):1/60; lastTime = now;
    const before = engine.snapshot().mode;
    if (playback) advancePlayback(now);
    else {
      engine.step(delta,reduced.matches);
      if (before!=='idle' && before!=='paused') {
        frames.push({...engine.snapshot(),time:(now-origin)/1000,clock:now});
        if (frames.length>900) frames.shift();
        selected = frames.length-1;
      }
    }
    paint(now);
    const mode = engine.snapshot().mode;
    if (!document.hidden && (playback || !['idle','paused'].includes(mode) || (mode==='idle' && !reduced.matches && settings.twinkle>0))) frameId=requestAnimationFrame(tick);
  }
  function wake() { if (!frameId && !document.hidden) frameId=requestAnimationFrame(tick); }
  document.querySelector('#panel-toggle').addEventListener('click',e => {
    const panel = document.querySelector('#panel'); panel.hidden=!panel.hidden;
    document.querySelector('#workspace').classList.toggle('panel-hidden',panel.hidden);
    e.currentTarget.setAttribute('aria-expanded',String(!panel.hidden));
    e.currentTarget.textContent=panel.hidden?'显示参数':'隐藏参数';
  });
  reduced.addEventListener('change',() => {
    gesture.cancel(); playback=null;
    if (reduced.matches) engine.snap(); wake();
  });
  document.addEventListener('visibilitychange',() => {
    if (document.hidden) { cancelAnimationFrame(frameId); frameId=0; }
    else { lastTime=0; wake(); }
  });
  ToggleSettings.subscribe(applySettings);
  new ResizeObserver(resize).observe(thumb);
  window.addEventListener('resize',resize);
  applySettings();
})();
