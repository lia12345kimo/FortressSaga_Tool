const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('all icons are transparent 256 by 256 PNG files', () => {
  const directory = path.join(__dirname, 'assets', 'icons');
  const files = fs.readdirSync(directory).filter(name => name.endsWith('.png'));
  assert.equal(files.length, 36);
  for (const file of files) {
    const png = fs.readFileSync(path.join(directory, file));
    assert.equal(png.readUInt32BE(16), 256, `${file} width`);
    assert.equal(png.readUInt32BE(20), 256, `${file} height`);
    assert.equal(png[25], 6, `${file} must use RGBA color type`);
  }
});

test('app does not add replacement arrows or neon icon styles', () => {
  const app = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  assert.doesNotMatch(app, /icon-mark|AMP_MARK|iconStyle/);
  assert.doesNotMatch(html, /ICON風格|iconStyle/);
});
