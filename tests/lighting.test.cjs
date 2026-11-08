const { test } = require('node:test');
const assert = require('node:assert/strict');
const { boundary, sources, irradiance } = require('../lighting.js');
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);

test('external source maintains normal gap under squash and stretch', () => {
  for (const [sx, sy] of [[1, 1], [.84, 1.12], [1.24, .84]]) {
    for (const radius of [20, 43, 65]) {
      const light = sources(19, 65, radius, sx, sy, 7);
      light.forEach((s, i) => {
        const p = boundary((19 + 65 * (i / 64 - .5)) / 100, radius, sx, sy);
        near(Math.hypot(s.x - p.x, s.y - p.y), 7);
        near((s.x - p.x) * p.ny - (s.y - p.y) * p.nx, 0);
      });
    }
  }
});

test('day and night arcs and received illumination are mirror symmetric', () => {
  for (const phase of [0, 50, -50]) {
    const lights = sources(phase, 34, 43, 1, 1, 5);
    lights.forEach((p, i) => {
      near(p.x + lights[64 - i].x, 180);
      near(p.y, lights[64 - i].y);
    });
    near(irradiance(boundary(.4, 43), lights), irradiance(boundary(.6, 43), lights));
  }
});

test('glass receives directional light with distance falloff and soft endpoints', () => {
  const bottom = boundary(.5, 43), top = boundary(0, 43);
  const lights = sources(50, 34, 43, 1, 1, 5);
  assert.ok(irradiance(bottom, lights) > .6);
  assert.ok(irradiance(top, lights) < .05);
  assert.ok(irradiance(bottom, sources(50, 34, 43, 1, 1, 10)) < irradiance(bottom, lights));
  const outside = irradiance(boundary(.68, 43), lights);
  assert.ok(outside > 0 && outside < irradiance(bottom, lights));
  const side = sources(25, 34, 43, 1, 1, 5);
  assert.ok(irradiance(boundary(.25, 43), side) > .6);
  assert.ok(irradiance(boundary(.75, 43), side) < .05);
});
