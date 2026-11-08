window.createParticles = function (canvas) {
  const { glyph, random, clamp, mix } = ToggleMath;
  const ctx = canvas.getContext('2d'), targets = [glyph(false),glyph(true)];
  const rng = random(217), count = Math.max(...targets.map(p => p.length));
  const seeds = Array.from({length:count},() => ({angle:rng()*Math.PI*2,force:.3+rng()*.7,phase:rng()*Math.PI*2}));
  function resize(size,dpr) {
    canvas.width = Math.round(size*dpr); canvas.height = canvas.width;
    ctx.setTransform(canvas.width/180,0,0,canvas.height/180,0,0);
  }
  function draw(x,clock,settings,reduced) {
    const p = clamp(x,0,1), morph = p*p*(3-2*p);
    const burst = Math.sin(Math.PI*p)**1.5*settings.spread;
    // Dark grains remain legible against the neutral glass at the midpoint.
    const inkMix = clamp((p-.38)/.1,0,1);
    const ink = [mix(255,61,inkMix),mix(251,59,inkMix),mix(231,51,inkMix)].map(Math.round);
    ctx.clearRect(0,0,180,180);
    for (let i=0;i<count;i++) {
      const from = targets[0][i%targets[0].length], to = targets[1][i%targets[1].length], seed = seeds[i];
      const alpha = mix(i<targets[0].length?from.alpha:0,i<targets[1].length?to.alpha:0,morph);
      if (alpha<.01) continue;
      const angle = seed.angle+p*2.4;
      const px = mix(from.x,to.x,morph)+Math.cos(angle)*burst*seed.force;
      const py = mix(from.y,to.y,morph)+Math.sin(angle)*burst*seed.force;
      const shimmer = reduced?1:1-settings.twinkle*(.5+.5*Math.sin(clock*.002+seed.phase));
      ctx.globalAlpha = alpha*shimmer; ctx.fillStyle = `rgb(${ink.join(',')})`;
      ctx.shadowColor = `rgba(255,246,224,${(1-p)*.55})`;
      ctx.shadowBlur = (1-p)*(p>0 && p<1?5:2.5);
      const size = settings.size*(p>0 && p<1?.7+.5*seed.force:1);
      ctx.fillRect(px-size/2,py-size/2,size,size);
    }
    ctx.globalAlpha = 1;
  }
  return { resize,draw };
};
