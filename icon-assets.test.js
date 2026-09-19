const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RELEASE = '20260918-13';
const read = name => fs.readFileSync(path.join(__dirname, name), 'utf8');

// WebP 的長寬藏在 VP8X 區塊：第 24~26 位元組是寬度減一，27~29 是高度減一，
// 都是 24 位元小端序；第 20 位元組的 0x10 旗標代表含 alpha 通道。
function readVp8x(buffer, name) {
  assert.equal(buffer.subarray(0, 4).toString('latin1'), 'RIFF', `${name} RIFF`);
  assert.equal(buffer.subarray(8, 12).toString('latin1'), 'WEBP', `${name} WEBP`);
  assert.equal(buffer.subarray(12, 16).toString('latin1'), 'VP8X', `${name} VP8X`);
  return {
    hasAlpha: (buffer[20] & 0x10) !== 0,
    width: buffer.readUIntLE(24, 3) + 1,
    height: buffer.readUIntLE(27, 3) + 1,
  };
}

test('all icons are transparent 128 by 128 WebP files', () => {
  const directory = path.join(__dirname, 'assets', 'icons');
  const entries = fs.readdirSync(directory);
  const files = entries.filter(name => name.endsWith('.webp'));
  assert.equal(files.length, 36);
  assert.equal(entries.filter(name => name.endsWith('.png')).length, 0,
    '舊的 PNG 應已移除，避免重複佔用流量');
  for (const file of files) {
    const info = readVp8x(fs.readFileSync(path.join(directory, file)), file);
    assert.equal(info.width, 128, `${file} width`);
    assert.equal(info.height, 128, `${file} height`);
    assert.ok(info.hasAlpha, `${file} must keep its alpha channel`);
  }
});

test('app requests icons as WebP', () => {
  const app = read('app.js');
  assert.ok(app.includes('assets/icons/'), 'icon path');
  assert.ok(app.includes('.webp?v=' + RELEASE), 'icons must be WebP at the release version');
  assert.ok(!app.includes('.png'), 'no PNG icon references may remain');
});

test('app does not add replacement arrows or neon icon styles', () => {
  const app = read('app.js');
  const html = read('index.html');
  for (const banned of ['icon-mark', 'AMP_MARK', 'iconStyle']) {
    assert.ok(!app.includes(banned), `app.js must not contain ${banned}`);
  }
  for (const banned of ['ICON風格', 'iconStyle']) {
    assert.ok(!html.includes(banned), `index.html must not contain ${banned}`);
  }
});

test('browser scripts use a cache-busting release version', () => {
  const html = read('index.html');
  for (const asset of ['connectivity.js', 'effect-engine.js', 'mobile-ui.js', 'optimizer.js', 'app.js']) {
    assert.ok(html.includes(asset + '?v=' + RELEASE), `${asset} must be cache-busted`);
  }
  assert.ok(!html.includes('?v=20260918-12'), '不可殘留舊版本號');
});

test('mobile picker rows keep their own height inside the flex column', () => {
  const css = read('icon-fix.css');
  // 側欄是縱向 flex；篩選列若沒鎖住高度會被零件清單壓扁，按鈕就被切掉一半。
  for (const row of ['.picker-handle', '.picker-head', '.mobile-filters']) {
    const rule = css.slice(css.indexOf(row + ' {'));
    assert.ok(rule.startsWith(row + ' { flex: 0 0 auto;'), `${row} 需要 flex: 0 0 auto`);
  }
  const palette = css.slice(css.indexOf('.mobile-palette {'));
  assert.ok(palette.startsWith('.mobile-palette { flex: 1 1 auto; min-height: 0;'),
    '.mobile-palette 需要 flex: 1 1 auto 與 min-height: 0 才能自行捲動');
});
