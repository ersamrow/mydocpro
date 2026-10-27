import test from 'node:test';
import assert from 'node:assert/strict';
import {downloadName} from '../src/download-name.js';

test('custom names preserve actual output format and avoid duplicate extensions', () => {
  assert.equal(downloadName('My pages.pdf', 'mydocpro-split-pdf.pdf'), 'My pages.pdf');
  assert.equal(downloadName('Photo.png', 'mydocpro-convert-image.jpg'), 'Photo.jpg');
  assert.equal(downloadName('  ', 'mydocpro-merge-pdf.pdf'), 'mydocpro-merge-pdf.pdf');
});
test('separate page downloads retain unique page numbers', () => {
  assert.equal(downloadName('Report', 'page-2.pdf'), 'Report-page-2.pdf');
  assert.equal(downloadName('Report', 'page-1.pdf'), 'Report-page-1.pdf');
});
test('filenames cannot contain path separators or reserved device names', () => {
  assert.equal(downloadName('a/b\\c:report', 'out.pdf'), 'a-b-c-report.pdf');
  assert.equal(downloadName('CON', 'out.pdf'), 'file-CON.pdf');
  assert.equal(downloadName('...', 'out.pdf'), 'out.pdf');
});
