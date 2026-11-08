const { test } = require('node:test');
const assert = require('node:assert/strict');
const { glyph, sanitize } = require('../dynamics.js');

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

test('moon has a dim checkerboard inside its dark face; sun remains opaque', () => {
  assert.ok(glyph(false).some(p => p.alpha > 0 && p.alpha < .2));
  assert.ok(glyph(true).every(p => p.alpha === 1));
});
