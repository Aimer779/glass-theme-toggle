const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
for (const file of ['script.js', 'dynamics.js', 'settings.js', 'curve-panel.js', 'motion.js', 'gesture.js', 'particles.js', 'lighting.js', 'comparison.js']) {
  new vm.Script(fs.readFileSync(path.join(root, file), 'utf8'), { filename: file });
}
for (const entry of ['index.html', 'comparison.html']) {
  const html = fs.readFileSync(path.join(root, entry), 'utf8');
  for (const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
    assert.ok(fs.existsSync(path.join(root, match[1])), `Missing asset: ${match[1]}`);
  }
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(ids.length, new Set(ids).size, 'Duplicate HTML id');
}
const config = JSON.parse(fs.readFileSync(path.join(root, 'devservers.json'), 'utf8'));
assert.equal(config.servers[0].port, 18240);
console.log('PASS: JavaScript syntax, local references, unique IDs and server configuration');
require('./dynamics.test.cjs');
require('./motion.test.cjs');
require('./gesture.test.cjs');
require('./lighting.test.cjs');
