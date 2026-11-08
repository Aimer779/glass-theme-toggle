(function(root) {
  'use strict';
  const wrap = x => ((x % 1) + 1) % 1;
  const linear = v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
  const display = v => v <= .0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - .055;
  // Arc length starts at the top midpoint and runs clockwise.
  function boundary(t, radius, sx = 1, sy = 1) {
    const straight = 180 - 2 * radius, quarter = Math.PI * radius / 2;
    const length = 4 * straight + 4 * quarter;
    let d = wrap(t) * length + straight / 2;
    const side = Math.floor(d / (straight + quarter)) % 4;
    d %= straight + quarter;
    let x, y, nx, ny;
    if (d <= straight) { x = radius + d; y = 0; nx = 0; ny = -1; }
    else {
      const a = (d - straight) / radius - Math.PI / 2;
      x = 180 - radius + radius * Math.cos(a);
      y = radius + radius * Math.sin(a); nx = Math.cos(a); ny = Math.sin(a);
    }
    for (let i = 0; i < side; i++) {
      [x, y] = [180 - y, x]; [nx, ny] = [-ny, nx];
    }
    const n = Math.hypot(nx / sx, ny / sy);
    return { x: 90 + (x - 90) * sx, y: 90 + (y - 90) * sy,
      nx: nx / sx / n, ny: ny / sy / n };
  }
  function sources(phase, arc, radius, sx, sy, gap, count = 64) {
    return Array.from({ length: count + 1 }, (_, i) => {
      const p = boundary((phase + arc * (i / count - .5)) / 100, radius, sx, sy);
      return { ...p, x: p.x + p.nx * gap, y: p.y + p.ny * gap };
    });
  }
  function irradiance(p, lights) {
    let value = 0;
    for (let i = 0; i < lights.length - 1; i++) {
      const a = lights[i], b = lights[i + 1];
      const dx = (a.x + b.x) / 2 - p.x, dy = (a.y + b.y) / 2 - p.y;
      const distance = Math.hypot(dx, dy);
      const facing = Math.max(0, (dx * p.nx + dy * p.ny) / Math.max(distance, .01));
      // Rough glass also transports light past the directly facing edge.
      value += Math.hypot(b.x - a.x, b.y - a.y) *
        (facing / (distance * distance + 36) + .003 * Math.exp(-distance / 38));
    }
    return 1 - Math.exp(-value * 5);
  }
  function create(canvas) {
    const ctx = canvas.getContext('2d');
    const resolution = 96;
    const field = document.createElement('canvas'); field.width = field.height = resolution;
    const fieldContext = field.getContext('2d');
    const pixels = fieldContext.createImageData(resolution, resolution);
    // Include three blur radii at the largest bloom, plus gap and elastic stretch.
    const pad = 176, extent = 180 + pad * 2;
    let scale = 1, ratio = 1, last = '';
    function resize(size, dpr) {
      scale = size / 180; ratio = dpr;
      canvas.width = canvas.height = Math.ceil(extent * scale * ratio);
      Object.assign(canvas.style, { width: extent * scale + 'px', height: extent * scale + 'px',
        left: -pad * scale + 'px', top: -pad * scale + 'px' });
      last = '';
    }
    function draw(frame, settings, color, day) {
      const { sx, sy, phase } = frame;
      const key = JSON.stringify([sx, sy, phase, settings, color, day]);
      if (key === last) return;
      last = key;
      // Cancel parent scaling: geometry deforms, but source width and gap do not.
      canvas.style.transform = `scale(${1 / sx},${1 / sy})`;
      ctx.setTransform(scale * ratio, 0, 0, scale * ratio, pad * scale * ratio, pad * scale * ratio);
      ctx.clearRect(-pad, -pad, extent, extent);
      if (!settings.glow) return;
      const arc = settings.nightArc + (settings.arc - settings.nightArc) * day;
      const lights = sources(phase, arc, settings.radius, sx, sy, settings.gap);
      const edge = Array.from({ length: 257 }, (_, i) => boundary(i / 256, settings.radius, sx, sy));
      const shape = new Path2D(); shape.moveTo(edge[0].x, edge[0].y);
      edge.slice(1).forEach(p => shape.lineTo(p.x, p.y)); shape.closePath();
      const lamp = new Path2D(); lamp.moveTo(lights[0].x, lights[0].y);
      lights.slice(1).forEach(p => lamp.lineTo(p.x, p.y));
      const rgb = color.map(Math.round).join(',');
      const energy = settings.glow;
      const hot = day > .75 ? '255,255,183' : day > .25 ? '255,248,231' : '246,255,255';
      const hotChannels = hot.split(',').map(Number);
      const haze = color.map((v,i)=>Math.round(v*.8+hotChannels[i]*.2)).join(',');
      ctx.save();
      // The glass occludes external bloom. Its transmitted light is drawn separately.
      const outside = new Path2D(); outside.rect(-pad, -pad, extent, extent); outside.addPath(shape);
      ctx.clip(outside, 'evenodd'); ctx.lineCap = 'round';
      for (const [width, blur, alpha, tint] of [[24, settings.bloom * 2.5, .5, rgb], [10, settings.bloom, .85, rgb], [4.8, 2.2, 1, haze]]) {
        ctx.strokeStyle = `rgba(${tint},${Math.min(1, alpha * energy)})`;
        ctx.lineWidth = width; ctx.filter = `blur(${blur * scale * ratio}px)`; ctx.stroke(lamp);
      }
      ctx.filter = 'none'; ctx.lineWidth = settings.lineWidth;
      ctx.strokeStyle = `rgba(${hot},${Math.min(1, energy)})`; ctx.stroke(lamp);
      for (const p of [lights[0], lights[lights.length - 1]]) {
        const flare = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,15);
        flare.addColorStop(0,`rgba(${hot},${Math.min(.85,energy*.7)})`);
        flare.addColorStop(.2,`rgba(${rgb},${Math.min(.65,energy*.5)})`);
        flare.addColorStop(1,`rgba(${rgb},0)`);
        ctx.fillStyle=flare;ctx.fillRect(p.x-15,p.y-15,30,30);
      }
      ctx.restore();
      ctx.save(); ctx.clip(shape);
      // Accumulate in floating point, then quantize once to avoid layered 8-bit banding.
      const depth = settings.scatter;
      const emitters = [];
      for (let i = 0; i < lights.length - 1; i += 4) {
        const a = lights[i], b = lights[i + 4];
        // Curved bevels concentrate transmitted light around the rounded corners.
        const focus = 1 + 1.2 * (Math.abs(a.nx * a.ny) + Math.abs(b.nx * b.ny));
        emitters.push({x: (a.x + b.x) / 2, y: (a.y + b.y) / 2,
          weight: Math.hypot(b.x - a.x, b.y - a.y) / depth * focus});
      }
      const warm = hot.split(',').map(Number);
      const emitted = color.map(v => linear(v / 255));
      const nightWeight = (1 - day) ** 2;
      const nearTint = warm.map((v,c) => linear(v / 255) * (1 - nightWeight) +
        Math.min(1, emitted[c] + (c === 1 ? .04 : 0)) * nightWeight);
      for (let y = 0; y < resolution; y++) for (let x = 0; x < resolution; x++) {
        const px = 90 + ((x + .5) / resolution * 180 - 90) * sx;
        const py = 90 + ((y + .5) / resolution * 180 - 90) * sy;
        let power = 0, nearPower = 0;
        for (const source of emitters) {
          const d2 = (px - source.x) ** 2 + (py - source.y) ** 2;
          power += source.weight * Math.exp(-d2 / (depth * depth) * 4);
          nearPower += source.weight / .38 * Math.exp(-d2 / ((depth * .38) ** 2) * 2);
        }
        const index = (y * resolution + x) * 4;
        const strength = energy * settings.innerGlow;
        const radiance = emitted.map((v,c) => display(1 - Math.exp(-strength *
          (v * power * .75 + nearTint[c] * nearPower * 1.25))));
        const alphaNight = Math.max(...radiance), alphaDay = 1 - Math.exp(-power * strength * 2.4);
        const white = Math.min(.75, nearPower * .4);
        for (let c = 0; c < 3; c++) {
          const night = alphaNight > 0 ? radiance[c] / alphaNight * 255 : 0;
          const daylight = color[c] * (1 - white) + warm[c] * white;
          pixels.data[index + c] = night * nightWeight + daylight * (1 - nightWeight);
        }
        pixels.data[index + 3] = 255 * (alphaNight * nightWeight + alphaDay * (1 - nightWeight));
      }
      fieldContext.putImageData(pixels, 0, 0);
      ctx.drawImage(field, 90 - 90 * sx, 90 - 90 * sy, 180 * sx, 180 * sy);
      // One continuous stroke avoids seams between independently antialiased segments.
      const exposure = edge.map(p => {
        // Fit the bright, grazing bevel seen in the reference without lighting the far edge.
        const received = irradiance(p, lights);
        const t = Math.max(0, Math.min(1, (received - .09) / .23));
        return t * t * (3 - 2 * t) * energy * settings.edgeLight;
      });
      const bevel = settings.bevel / 2.2;
      for (const [width, alpha, tint] of [[18, .18, rgb], [11, .4, hot], [7.4, .95, hot]]) {
        const gradient = ctx.createConicGradient(-Math.PI / 2, 90, 90);
        edge.forEach((p, i) => {
          const angle = i === 256 ? 1 : wrap((Math.atan2(p.y - 90, p.x - 90) + Math.PI / 2) / (Math.PI * 2));
          gradient.addColorStop(angle, `rgba(${tint},${Math.min(1, alpha * exposure[i])})`);
        });
        ctx.lineWidth = width * bevel; ctx.strokeStyle = gradient; ctx.stroke(shape);
      }
      ctx.restore();
    }
    return { resize, draw };
  }
  const api = { boundary, sources, irradiance, create };
  if (typeof module !== 'undefined') module.exports = api;
  else root.ToggleLighting = api;
})(typeof window !== 'undefined' ? window : globalThis);
