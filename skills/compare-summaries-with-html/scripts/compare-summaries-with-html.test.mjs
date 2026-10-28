import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import test from 'node:test';

import {
  extractSummary,
  pairRunItems,
  parseArguments,
  renderMarkdown,
  renderReport,
  resolveOutputPath,
} from './compare-summaries-with-html.mjs';

const run = (name, itemIds) => ({
  name,
  datasetRunItems: itemIds.map(datasetItemId => ({ datasetItemId })),
});

test('requires exactly two distinct named runs and an output path', () => {
  const options = parseArguments([
    '--dataset',
    'ma-summary-benchmarks',
    '--baseline-run',
    'baseline',
    '--candidate-run',
    'candidate',
    '--output',
    '/tmp/comparison.html',
  ]);

  assert.equal(options.baselineRun, 'baseline');
  assert.equal(options.candidateRun, 'candidate');
  assert.throws(
    () =>
      parseArguments([
        '--dataset',
        'ma-summary-benchmarks',
        '--baseline-run',
        'same',
        '--candidate-run',
        'same',
        '--output',
        '/tmp/comparison.html',
      ]),
    /must be different/
  );
});

test('rejects report output inside the repository', () => {
  assert.equal(resolveOutputPath('/tmp/comparison.html', '/repo'), resolve('/tmp/comparison.html'));
  assert.throws(() => resolveOutputPath('/repo/report.html', '/repo'), /outside the repository/);
  assert.throws(() => resolveOutputPath('report.html', '/repo'), /absolute path/);
});

test('extracts wrapped string summaries without exposing other trace fields', () => {
  assert.equal(extractSummary({ output: { result: { markdown: '# Summary' } } }), '# Summary');
  assert.equal(extractSummary({ input: 'private transcript' }), '');
});

test('pairs summary outputs by dataset item ID regardless of source ordering', () => {
  const pairs = pairRunItems(
    run('baseline', ['item-b', 'item-a']),
    run('candidate', ['item-a', 'item-b']),
    [{ output: 'Baseline B' }, { output: 'Baseline A' }],
    [{ output: 'Candidate A' }, { output: 'Candidate B' }]
  );

  assert.deepEqual(pairs, [
    { datasetItemId: 'item-a', baseline: 'Baseline A', candidate: 'Candidate A' },
    { datasetItemId: 'item-b', baseline: 'Baseline B', candidate: 'Candidate B' },
  ]);
});

test('refuses comparisons with mismatched dataset items or absent outputs', () => {
  assert.throws(
    () =>
      pairRunItems(
        run('baseline', ['item-a']),
        run('candidate', ['item-b']),
        [{ output: 'Baseline' }],
        [{ output: 'Candidate' }]
      ),
    /do not contain the same dataset items/
  );
  assert.throws(
    () =>
      pairRunItems(
        run('baseline', ['item-a']),
        run('candidate', ['item-a']),
        [{ output: '' }],
        [{ output: 'Candidate' }]
      ),
    /without a summary output/
  );
});

test('renders a safe semantic Markdown subset', () => {
  const html = renderMarkdown(
    '# Heading\n\n- **bold** and `code`\n\n[Safe](https://example.com) [Unsafe](javascript:alert(1))\n\n```ts\nconst value = 1;\n```'
  );

  assert.match(html, /<h3>Heading<\/h3>/);
  assert.match(html, /<ul><li><strong>bold<\/strong> and <code>code<\/code><\/li><\/ul>/);
  assert.match(html, /<a href="https:\/\/example\.com">Safe<\/a> Unsafe/);
  assert.doesNotMatch(html, /javascript:/);
  assert.match(html, /<pre tabindex="0"><code class="language-ts">const value = 1;<\/code><\/pre>/);
});

test('preserves nested bullets under their parent and returns to sibling items', () => {
  assert.equal(
    renderMarkdown('- Parent\n  - Child\n    - Grandchild\n  - Another child\n- Sibling'),
    '<ul><li>Parent<ul><li>Child<ul><li>Grandchild</li></ul></li><li>Another child</li></ul></li><li>Sibling</li></ul>'
  );
});

test('preserves mixed ordered and unordered nested lists', () => {
  assert.equal(
    renderMarkdown('1. Parent\n   - Child\n     1. Grandchild\n2. Sibling'),
    '<ol><li>Parent<ul><li>Child<ol><li>Grandchild</li></ol></li></ul></li><li>Sibling</li></ol>'
  );
});

test('renders a self-contained responsive report without transcript inputs', () => {
  const report = renderReport({
    dataset: 'ma-summary-benchmarks',
    baselineRun: 'baseline',
    candidateRun: 'candidate',
    pairs: [{ datasetItemId: 'item-a', baseline: '# Old', candidate: '# New' }],
  });

  assert.match(report, /<!DOCTYPE html>/);
  assert.match(report, /<main>/);
  assert.match(report, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(report, /@media \(max-width: 55rem\)/);
  assert.doesNotMatch(report, /private transcript/);
});
