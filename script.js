(() => {
  'use strict';
  const { clamp, mix, curves, glyph, random, rimPath, rimOffset } = ToggleMath;
  const stage = document.querySelector('.stage');
  const button = document.querySelector('#theme-switch');
  const thumb = document.querySelector('.thumb');
  const canvas = document.querySelector('.particles');
  const ctx = canvas.getContext('2d');
  const rimPaths = [...document.querySelectorAll('.rim-path')];
  const core = document.querySelector('.rim-core');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const targets = [glyph(false), glyph(true)];
  const rng = random(217);
  const count = Math.max(...targets.map(p => p.length));
  function targetParticles(target) {
    const points = targets[target];
    return Array.from({ length: count }, (_, i) => ({ ...points[i % points.length], alpha: i < points.length ? points[i].alpha : 0 }));
  }
  const particles = targetParticles(0).map(p => ({ ...p, angle: rng()*Math.PI*2, force: .3+rng()*.7, phase: rng()*Math.PI*2 }));
  let settings = ToggleSettings.values;
  let day = 0, targetDay = 0, travel = 0, rimCenter = 50;
  let frameId = 0, pathLength = 1, freezeTime = 0;
  let motion = canonical(0);
  motion.progress = 1; motion.playing = false;
  function canonical(target) {
    return { source: targetParticles(1-target), dayStart: 1-target, travelStart: 1-target, rimStart: target ? 50 : 0, rimEnd: target ? 100 : 50, progress: 0, paused: false, playing: true, start: performance.now() };
  }
  const chart = createCurvePanel({ seek, replay, resume });
  function rgb(hex) { return hex.match(/[a-f\d]{2}/gi).map(v => parseInt(v, 16)); }
  function sample(t) {
    motion.progress = clamp(t, 0, 1);
    const phase = curves(motion.progress, settings.easing);
    day = mix(motion.dayStart, targetDay, clamp(t*1.8, 0, 1));
    travel = mix(motion.travelStart, targetDay, phase.travel);
    rimCenter = mix(motion.rimStart, motion.rimEnd, phase.rim);
    const points = targets[targetDay];
    const burst = Math.sin(Math.PI*t)**1.5 * settings.spread;
    particles.forEach((p, i) => {
      const from = motion.source[i], to = points[i % points.length];
      const angle = p.angle + t*2.4;
      p.x = mix(from.x, to.x, phase.morph) + Math.cos(angle)*burst*p.force;
      p.y = mix(from.y, to.y, phase.morph) + Math.sin(angle)*burst*p.force;
      p.alpha = mix(from.alpha, i < points.length ? to.alpha : 0, phase.morph);
    });
  }
  function play() {
    motion.paused = false;
    motion.playing = !reduced.matches;
    motion.start = performance.now() - motion.progress*settings.duration;
    if (reduced.matches) sample(1);
    wake();
  }
  function toggle() {
    targetDay = 1-targetDay;
    let rimEnd = targetDay ? 0 : 50;
    while (rimEnd <= rimCenter + .001) rimEnd += 100;
    motion = { source: particles.map(p => ({ x: p.x, y: p.y, alpha: p.alpha })), dayStart: day, travelStart: travel, rimStart: rimCenter, rimEnd, progress: 0 };
    play();
  }
  function seek(t) {
    motion.playing = false; motion.paused = true; freezeTime = performance.now();
    sample(t); wake();
  }
  function replay() {
    motion = canonical(targetDay); sample(0); play();
  }
  function resume() {
    if (motion.paused && motion.progress < 1) play();
  }
  function resize() {
    const size = thumb.getBoundingClientRect().width;
    const dpr = devicePixelRatio || 1;
    canvas.width = Math.round(size*dpr); canvas.height = canvas.width;
    ctx.setTransform(canvas.width/180, 0, 0, canvas.height/180, 0, 0);
    stage.style.setProperty('--radius', settings.radius*size/180+'px');
    stage.style.setProperty('--track-radius', (settings.radius+9)*size/180+'px');
    rimPaths.forEach((path, i) => path.setAttribute('d', rimPath(settings.radius, i === 3 ? settings.gap : 0)));
    pathLength = core.getTotalLength();
    wake();
  }
  function applySettings() {
    settings = ToggleSettings.values;
    if (motion.playing) motion.start = performance.now()-motion.progress*settings.duration;
    sample(motion.progress);
    stage.style.setProperty('--width', settings.width+'px');
    stage.style.setProperty('--glass', settings.glass);
    stage.style.setProperty('--blur', settings.blur+'px');
    stage.style.setProperty('--glow', settings.glow);
    stage.style.setProperty('--inner-glow', settings.innerGlow);
    stage.style.setProperty('--line-width', settings.lineWidth);
    document.querySelector('#bloom feGaussianBlur').setAttribute('stdDeviation', settings.bloom);
    for (const path of rimPaths) path.style.strokeDasharray = `${settings.arc} ${100-settings.arc}`;
    resize();
  }
  function paint(now) {
    const night = rgb(settings.nightColor), light = rgb(settings.dayColor);
    const color = night.map((v, i) => Math.round(mix(v, light[i], day)));
    stage.style.setProperty('--day', day);
    stage.style.setProperty('--accent', color.join(','));
    stage.style.setProperty('--rim-phase', rimOffset(rimCenter, settings.arc));
    // Position the transmitted light on the same rounded contour as the stroke.
    const center = ((rimCenter%100)+100)%100;
    const lightPoint = core.getPointAtLength(center/100*pathLength);
    stage.style.setProperty('--light-x', lightPoint.x/180*100+'%');
    stage.style.setProperty('--light-y', lightPoint.y/180*100+'%');
    thumb.style.transform = `translateX(${travel*button.clientWidth*.5}px)`;
    ctx.clearRect(0, 0, 180, 180);
    const ink = [mix(255,61,day), mix(251,59,day), mix(231,51,day)].map(Math.round);
    const drawingTime = motion.paused ? freezeTime : now;
    particles.forEach(p => {
      if (p.alpha < .01) return;
      const shimmer = reduced.matches ? 1 : 1-settings.twinkle*(.5+.5*Math.sin(drawingTime*.002+p.phase));
      ctx.globalAlpha = p.alpha*shimmer;
      ctx.fillStyle = `rgb(${ink.join(',')})`;
      ctx.shadowColor = `rgba(255,246,224,${(1-day)*.55})`;
      ctx.shadowBlur = (1-day)*(motion.progress > 0 && motion.progress < 1 ? 5 : 2.5);
      const s = settings.size*(motion.progress > 0 && motion.progress < 1 ? .7+.5*p.force : 1);
      ctx.fillRect(p.x-s/2, p.y-s/2, s, s);
    });
    ctx.globalAlpha = 1;
    button.setAttribute('aria-checked', String(!targetDay));
    button.dataset.animating = String(motion.playing);
    button.dataset.progress = motion.progress.toFixed(5);
    button.dataset.paused = String(!!motion.paused);
    document.querySelector('#theme-label').textContent = targetDay ? '日间' : '夜间';
    chart.update({ progress: motion.progress, paused: !!motion.paused, day: targetDay, power: settings.easing, duration: settings.duration, reduced: reduced.matches });
  }
  function tick(now) {
    frameId = 0;
    if (motion.playing) {
      sample(clamp((now-motion.start)/settings.duration, 0, 1));
      if (motion.progress === 1) motion.playing = false;
    }
    paint(now);
    if (!document.hidden && (motion.playing || (!motion.paused && !reduced.matches && settings.twinkle > 0))) frameId = requestAnimationFrame(tick);
  }
  function wake() {
    if (!frameId && !document.hidden) frameId = requestAnimationFrame(tick);
  }
  button.addEventListener('click', toggle);
  document.querySelector('#panel-toggle').addEventListener('click', e => {
    const panel = document.querySelector('#panel'); panel.hidden = !panel.hidden;
    document.querySelector('#workspace').classList.toggle('panel-hidden', panel.hidden);
    e.currentTarget.setAttribute('aria-expanded', String(!panel.hidden));
    e.currentTarget.textContent = panel.hidden ? '显示参数' : '隐藏参数';
  });
  reduced.addEventListener('change', () => {
    if (reduced.matches) { motion.playing = false; motion.paused = false; sample(1); }
    wake();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(frameId); frameId = 0; }
    else wake();
  });
  ToggleSettings.subscribe(applySettings);
  new ResizeObserver(resize).observe(thumb);
  window.addEventListener('resize', resize);
  applySettings();
})();
