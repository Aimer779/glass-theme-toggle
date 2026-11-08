/* Shared deterministic geometry keeps interrupted transitions reproducible. */
(function (root) {
  const clamp = (v, low, high) => Math.min(high, Math.max(low, v));
  const mix = (a, b, t) => a + (b - a) * t;
  const ease = (t, power = 4) => 1 - Math.pow(1 - clamp(t, 0, 1), power);
  function curves(t, power = 4) {
    t = clamp(t, 0, 1);
    return { travel: ease(t, power), morph: t * t * (3 - 2 * t), rim: ease(t, power) };
  }
  // Start at the top midpoint. Top=0%, bottom=50%, independent of radius.
  function rimPath(radius, gap = 0) {
    const low = -gap, high = 180 + gap, r = radius + gap;
    return `M90 ${low} H${high-r} A${r} ${r} 0 0 1 ${high} ${low+r} V${high-r} A${r} ${r} 0 0 1 ${high-r} ${high} H${low+r} A${r} ${r} 0 0 1 ${low} ${high-r} V${low+r} A${r} ${r} 0 0 1 ${low+r} ${low} H90 Z`;
  }
  const rimOffset = (center, length) => length / 2 - center;
  function glyph(day) {
    const points = [];
    for (let y = -11; y <= 11; y++) {
      for (let x = -11; x <= 11; x++) {
        const r = Math.hypot(x, y);
        const disc = r < 4.7;
        const ray = r >= 7 && r < 11 && (x === 0 || y === 0 || Math.abs(x) === Math.abs(y));
        const moon = Math.hypot(x + 1, y) < 8.6 && Math.hypot(x - 3.2, y + 3.1) > 7.6;
        const star = ((x === 8 && y >= -9 && y <= -7) || (y === -8 && x >= 7 && x <= 9) || (x === 5 && y === -3));
        const shadow = !day && !moon && !star && Math.hypot(x + 1, y) < 8.6 && (x+y)%2 === 0;
        if (day ? disc || ray : moon || star || shadow) points.push({ x: 90 + x * (day ? 3.35 : 3.75), y: 90 + y * (day ? 3.35 : 3.75), alpha: shadow ? .13 : 1 });
      }
    }
    return points;
  }
  function random(seed) {
    let state = seed >>> 0;
    return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  }
  function sanitize(input, schema, defaults) {
    const output = { ...defaults };
    for (const spec of schema) {
      const value = input?.[spec.key];
      if (spec.type === 'color') {
        if (typeof value === 'string' && /^#[\da-f]{6}$/i.test(value)) output[spec.key] = value;
      } else if (typeof value === 'number' && Number.isFinite(value)) {
        output[spec.key] = clamp(value, spec.min, spec.max);
      }
    }
    return output;
  }
  const api = { clamp, mix, ease, curves, rimPath, rimOffset, glyph, random, sanitize };
  if (typeof module !== 'undefined') module.exports = api;
  else root.ToggleMath = api;
})(globalThis);
