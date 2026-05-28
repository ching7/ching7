import { test } from 'node:test';
import assert from 'node:assert/strict';
import { replaceSection } from './replace-section.mjs';

test('replaceSection: swaps content between markers', () => {
  const tmpl = 'A\n<!--START_SECTION:foo-->\nOLD\n<!--END_SECTION:foo-->\nB';
  const out = replaceSection(tmpl, 'foo', 'NEW');
  assert.equal(out, 'A\n<!--START_SECTION:foo-->\nNEW\n<!--END_SECTION:foo-->\nB');
});

test('replaceSection: handles multi-line content', () => {
  const tmpl = '<!--START_SECTION:k-->\nX\n<!--END_SECTION:k-->';
  const out = replaceSection(tmpl, 'k', 'line1\nline2\nline3');
  assert.ok(out.includes('line1\nline2\nline3'));
  assert.ok(out.startsWith('<!--START_SECTION:k-->'));
  assert.ok(out.endsWith('<!--END_SECTION:k-->'));
});

test('replaceSection: missing key throws', () => {
  const tmpl = 'no markers here';
  assert.throws(
    () => replaceSection(tmpl, 'absent', 'whatever'),
    /SECTION:absent not found/
  );
});

test('replaceSection: leaves other sections untouched', () => {
  const tmpl = [
    '<!--START_SECTION:a-->old-a<!--END_SECTION:a-->',
    '<!--START_SECTION:b-->old-b<!--END_SECTION:b-->',
  ].join('\n');
  const out = replaceSection(tmpl, 'a', 'new-a');
  assert.ok(out.includes('new-a'));
  assert.ok(out.includes('old-b'));
});

test('replaceSection: special regex chars in content are safe', () => {
  const tmpl = '<!--START_SECTION:s-->X<!--END_SECTION:s-->';
  const tricky = '$1 $& \\n [ok]';
  const out = replaceSection(tmpl, 's', tricky);
  assert.ok(out.includes(tricky));
});
