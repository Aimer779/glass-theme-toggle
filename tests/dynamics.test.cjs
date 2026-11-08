const { test } = require('node:test');
const assert = require('node:assert/strict');
const { glyph, sanitize, rimOffset, rimPath } = require('../dynamics.js');

test('sun and moon targets remain inside the glass at maximum pixel size', () => {
  for (const day of [false, true]) {
    const points = glyph(day);
    assert.ok(points.length > 70);
    assert.equal(new Set(points.map(p => `${p.x},${p.y}`)).size, points.length);
    for (const p of points) {
      assert.ok(p.x > 40 && p.x < 140 && p.y > 40 && p.y < 140);
    }
  }
  assert.notDeepEqual(glyph(false), glyph(true));
});

test('stored parameters reject malformed colors, unknown keys and nonfinite values', () => {
  const defaults = { width: 420, color: '#ffffff' };
  const schema = [{ key: 'width', min: 280, max: 620 }, { key: 'color', type: 'color' }];
  assert.deepEqual(sanitize({ width: 900, color: 'red', injected: true }, schema, defaults), { width: 620, color: '#ffffff' });
  assert.deepEqual(sanitize({ width: Infinity }, schema, defaults), defaults);
  assert.deepEqual(sanitize(null, schema, defaults), defaults);
  assert.equal(sanitize({ color: '#8e87ff' }, schema, defaults).color, '#8e87ff');
});

test('highlight segment keeps its midpoint at the top or bottom for every length', () => {
  for (const center of [0, 50, 100, 150]) {
    for (const length of [10, 34, 65]) {
      const start = -rimOffset(center, length), end = start+length;
      assert.equal((start+end)/2, center);
    }
  }
  for (const radius of [20, 43, 65]) {
    for (const gap of [0, 2, 10]) assert.ok(rimPath(radius, gap).startsWith(`M90 ${-gap}`));
  }
});

test('moon has a dim checkerboard inside its dark face; sun remains opaque', () => {
  assert.ok(glyph(false).some(p => p.alpha > 0 && p.alpha < .2));
  assert.ok(glyph(true).every(p => p.alpha === 1));
});
