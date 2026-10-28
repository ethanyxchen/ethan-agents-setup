import { isAbsolute, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { writeFile } from 'node:fs/promises';

const outputKeys = ['markdown', 'summary', 'text', 'content', 'output', 'result'];

export function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help') {
      options.help = true;
      continue;
    }
    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`${argument} requires a value.`);
    }
    index += 1;
    if (argument === '--dataset') {
      options.dataset = value;
      continue;
    }
    if (argument === '--baseline-run') {
      options.baselineRun = value;
      continue;
    }
    if (argument === '--candidate-run') {
      options.candidateRun = value;
      continue;
    }
    if (argument === '--baseline-label') {
      options.baselineLabel = value;
      continue;
    }
    if (argument === '--candidate-label') {
      options.candidateLabel = value;
      continue;
    }
    if (argument === '--output') {
      options.output = value;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }
  if (options.help) {
    return options;
  }
  for (const [key, argument] of [
    ['dataset', '--dataset'],
    ['baselineRun', '--baseline-run'],
    ['candidateRun', '--candidate-run'],
    ['output', '--output'],
  ]) {
    if (!options[key]) {
      throw new Error(`${argument} is required.`);
    }
  }
  if (options.baselineRun === options.candidateRun) {
    throw new Error('--baseline-run and --candidate-run must be different.');
  }
  return options;
}

export function resolveOutputPath(output, workspaceRoot = process.cwd()) {
  if (!isAbsolute(output)) {
    throw new Error('--output must be an absolute path outside the repository.');
  }
  const outputPath = resolve(output);
  const workspacePath = resolve(workspaceRoot);
  const pathFromWorkspace = relative(workspacePath, outputPath);
  if (
    pathFromWorkspace === '' ||
    (!pathFromWorkspace.startsWith(`..${sep}`) &&
      pathFromWorkspace !== '..' &&
      !isAbsolute(pathFromWorkspace))
  ) {
    throw new Error('--output must be outside the repository.');
  }
  return outputPath;
}

export function extractSummary(output, depth = 0) {
  if (typeof output === 'string') {
    return output.trim();
  }
  if (output === null || typeof output !== 'object' || depth >= 8) {
    return '';
  }
  for (const key of outputKeys) {
    const summary = extractSummary(output[key], depth + 1);
    if (summary !== '') {
      return summary;
    }
  }
  return '';
}

export function pairRunItems(baselineRun, candidateRun, baselineTraces, candidateTraces) {
  const baselineItems = itemMap(baselineRun, baselineTraces);
  const candidateItems = itemMap(candidateRun, candidateTraces);
  const missingFromCandidate = [...baselineItems.keys()].filter(id => !candidateItems.has(id));
  const missingFromBaseline = [...candidateItems.keys()].filter(id => !baselineItems.has(id));
  if (missingFromCandidate.length > 0 || missingFromBaseline.length > 0) {
    throw new Error(
      `Experiment runs do not contain the same dataset items (${missingFromCandidate.length} missing from candidate; ${missingFromBaseline.length} missing from baseline).`
    );
  }
  return [...baselineItems.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([datasetItemId, baseline]) => ({
      datasetItemId,
      baseline,
      candidate: candidateItems.get(datasetItemId),
    }));
}

export function renderMarkdown(markdown) {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const html = [];
  for (let index = 0; index < lines.length; ) {
    const line = lines[index];
    if (line.trim() === '') {
      index += 1;
      continue;
    }
    if (line.startsWith('```')) {
      const language = line.slice(3).trim();
      const code = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith('```')) {
        code.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) {
        index += 1;
      }
      html.push(
        `<pre tabindex="0"><code${language === '' ? '' : ` class="language-${escapeAttribute(language)}"`}>${escapeHtml(code.join('\n'))}</code></pre>`
      );
      continue;
    }
    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading !== null) {
      const level = Math.min(6, heading[1].length + 2);
      html.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      index += 1;
      continue;
    }
    if (parseListItem(line) !== null) {
      const { content, nextIndex } = renderList(lines, index);
      html.push(content);
      index = nextIndex;
      continue;
    }
    if (line.startsWith('>')) {
      const quote = [];
      while (index < lines.length && lines[index].startsWith('>')) {
        quote.push(lines[index].replace(/^>\s?/, ''));
        index += 1;
      }
      html.push(`<blockquote><p>${renderInline(quote.join('<br>'))}</p></blockquote>`);
      continue;
    }
    const paragraph = [line];
    index += 1;
    while (index < lines.length && !isBlockStart(lines[index])) {
      if (lines[index].trim() !== '') {
        paragraph.push(lines[index]);
      }
      index += 1;
    }
    html.push(`<p>${renderInline(paragraph.join('<br>'))}</p>`);
  }
  return html.join('\n');
}

export function renderReport({
  dataset,
  baselineRun,
  candidateRun,
  baselineLabel,
  candidateLabel,
  pairs,
}) {
  const title = 'Summary comparison';
  const baselineHeading = baselineLabel ?? 'Baseline';
  const candidateHeading = candidateLabel ?? 'Candidate';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: light dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
    * { box-sizing: border-box; }
    body { background: Canvas; color: CanvasText; line-height: 1.5; margin: 0; }
    main { inline-size: min(100% - 2rem, 110rem); margin-inline: auto; padding-block: 2rem 4rem; }
    header { border-block-end: 1px solid color-mix(in srgb, CanvasText 18%, transparent); margin-block-end: 2rem; padding-block-end: 1.5rem; }
    h1 { font-size: clamp(1.75rem, 4vw, 2.75rem); line-height: 1.1; margin: 0; text-wrap: balance; }
    .metadata { color: color-mix(in srgb, CanvasText 70%, Canvas); margin-block: .75rem 0; overflow-wrap: anywhere; }
    .notice { background: color-mix(in srgb, CanvasText 8%, Canvas); border-inline-start: .25rem solid CanvasText; margin-block: 1rem; padding: .75rem 1rem; }
    .column-labels, .comparison { display: grid; gap: 1rem; grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .column-labels { margin-block-end: .75rem; }
    .column-labels h2 { font-size: 1rem; margin: 0; }
    .comparison { border-block-start: 1px solid color-mix(in srgb, CanvasText 18%, transparent); content-visibility: auto; contain-intrinsic-size: auto 56rem; padding-block: 1.5rem; }
    .item-id { color: color-mix(in srgb, CanvasText 65%, Canvas); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .875rem; grid-column: 1 / -1; margin: 0; overflow-wrap: anywhere; }
    article { background: color-mix(in srgb, CanvasText 4%, Canvas); border-radius: .5rem; min-inline-size: 0; padding: clamp(1rem, 2vw, 1.5rem); }
    article > :first-child { margin-block-start: 0; }
    article > :last-child { margin-block-end: 0; }
    h3, h4, h5, h6 { line-height: 1.2; text-wrap: balance; }
    pre { background: color-mix(in srgb, CanvasText 10%, Canvas); max-inline-size: 100%; overflow: auto; padding: 1rem; scrollbar-gutter: stable; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    :not(pre) > code { background: color-mix(in srgb, CanvasText 10%, Canvas); padding: .1em .25em; }
    blockquote { border-inline-start: .25rem solid color-mix(in srgb, CanvasText 35%, Canvas); margin-inline: 0; padding-inline-start: 1rem; }
    a { color: LinkText; }
    @media (max-width: 55rem) { .column-labels { display: none; } .comparison { grid-template-columns: 1fr; } .item-id { grid-column: auto; } article::before { color: color-mix(in srgb, CanvasText 65%, Canvas); content: attr(data-label); display: block; font-size: .875rem; font-weight: 700; margin-block-end: .75rem; text-transform: uppercase; } }
    @media print { main { inline-size: auto; max-inline-size: none; } .comparison { break-inside: avoid; content-visibility: visible; } }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>${escapeHtml(title)}</h1>
      <p class="metadata">Dataset: ${escapeHtml(dataset)}<br>Baseline run: ${escapeHtml(baselineRun)}<br>Candidate run: ${escapeHtml(candidateRun)}<br>Paired summaries: ${pairs.length}</p>
      <p class="notice">Private report. It contains raw meeting summaries. Do not commit, upload, or share it outside the authorized review.</p>
    </header>
    <section aria-label="Rendered summary comparisons">
      <div class="column-labels" aria-hidden="true"><h2>${escapeHtml(baselineHeading)}</h2><h2>${escapeHtml(candidateHeading)}</h2></div>
      ${pairs.map(pair => renderPair(pair, baselineHeading, candidateHeading)).join('\n')}
    </section>
  </main>
</body>
</html>`;
}

function itemMap(run, traces) {
  if (!Array.isArray(run.datasetRunItems) || run.datasetRunItems.length === 0) {
    throw new Error(`Experiment run ${run.name} has no dataset items.`);
  }
  if (traces.length !== run.datasetRunItems.length) {
    throw new Error(`Experiment run ${run.name} did not resolve every dataset item trace.`);
  }
  const items = new Map();
  for (let index = 0; index < run.datasetRunItems.length; index += 1) {
    const datasetItemId = run.datasetRunItems[index].datasetItemId;
    if (typeof datasetItemId !== 'string' || datasetItemId === '') {
      throw new Error(`Experiment run ${run.name} contains an item without a dataset item ID.`);
    }
    if (items.has(datasetItemId)) {
      throw new Error(`Experiment run ${run.name} contains a duplicate dataset item ID.`);
    }
    const summary = extractSummary(traces[index].output);
    if (summary === '') {
      throw new Error(`Experiment run ${run.name} contains an item without a summary output.`);
    }
    items.set(datasetItemId, summary);
  }
  return items;
}

function renderPair(pair, baselineLabel, candidateLabel) {
  return `<section class="comparison">
  <p class="item-id">Dataset item: ${escapeHtml(pair.datasetItemId)}</p>
  <article data-label="${escapeAttribute(baselineLabel)}">${renderMarkdown(pair.baseline)}</article>
  <article data-label="${escapeAttribute(candidateLabel)}">${renderMarkdown(pair.candidate)}</article>
</section>`;
}

function parseListItem(line) {
  const match = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(line);
  return match === null
    ? null
    : {
        indent: match[1].replaceAll('\t', '    ').length,
        tagName: /^\d/.test(match[2]) ? 'ol' : 'ul',
        text: match[3],
      };
}

function renderList(lines, index) {
  const { indent, tagName } = parseListItem(lines[index]);
  const items = [];
  while (index < lines.length) {
    const item = parseListItem(lines[index]);
    if (
      item === null ||
      item.indent < indent ||
      (item.indent === indent && item.tagName !== tagName)
    ) {
      break;
    }
    if (item.indent > indent) {
      const nested = renderList(lines, index);
      items[items.length - 1] += nested.content;
      index = nested.nextIndex;
      continue;
    }
    items.push(renderInline(item.text));
    index += 1;
  }
  return {
    content: `<${tagName}>${items.map(item => `<li>${item}</li>`).join('')}</${tagName}>`,
    nextIndex: index,
  };
}

function isBlockStart(line) {
  return (
    line.trim() === '' ||
    line.startsWith('```') ||
    /^(#{1,6})\s+/.test(line) ||
    /^\s*[-*+]\s+/.test(line) ||
    /^\s*\d+[.)]\s+/.test(line) ||
    line.startsWith('>')
  );
}

function renderInline(value) {
  const code = [];
  let html = escapeHtml(value).replace(/`([^`]+)`/g, (_, source) => {
    const index = code.push(`<code>${source}</code>`) - 1;
    return `\u0000${index}\u0000`;
  });
  html = html.replace(/\[([^\]]+)\]\(([^\s)]+)\)/g, (_, label, href) => {
    const destination = decodeHtml(href);
    return isSafeHref(destination)
      ? `<a href="${escapeAttribute(destination)}">${label}</a>`
      : label;
  });
  html = html
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
    .replace(/(?<!_)_([^_]+)_(?!_)/g, '<em>$1</em>');
  return html.replace(/\u0000(\d+)\u0000/g, (_, index) => code[Number(index)]);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll('`', '&#96;');
}

function decodeHtml(value) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
}

function isSafeHref(value) {
  return /^(https?:|mailto:)/i.test(value);
}

function createLangfuseClient(config) {
  const authorization = `Basic ${Buffer.from(`${config.publicKey}:${config.secretKey}`).toString('base64')}`;
  const request = async path => {
    const response = await fetch(`${config.baseUrl}${path}`, {
      headers: {
        Authorization: authorization,
        'X-Langfuse-Public-Key': config.publicKey,
      },
    });
    if (!response.ok) {
      throw new Error(`Langfuse request failed with HTTP ${response.status} for ${path}.`);
    }
    return response.json();
  };
  return {
    getRun: (datasetName, runName) =>
      request(
        `/api/public/datasets/${encodeURIComponent(datasetName)}/runs/${encodeURIComponent(runName)}`
      ),
    getTrace: traceId => request(`/api/public/traces/${encodeURIComponent(traceId)}`),
  };
}

function resolveLangfuseConfig(environment) {
  const required = ['LANGFUSE_BASE_URL', 'LANGFUSE_PUBLIC_KEY', 'LANGFUSE_SECRET_KEY'];
  const missing = required.filter(name => !environment[name]);
  if (missing.length > 0) {
    throw new Error(`Missing Langfuse environment variables: ${missing.join(', ')}.`);
  }
  return {
    baseUrl: environment.LANGFUSE_BASE_URL.replace(/\/$/, ''),
    publicKey: environment.LANGFUSE_PUBLIC_KEY,
    secretKey: environment.LANGFUSE_SECRET_KEY,
  };
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  const outputPath = resolveOutputPath(options.output);
  const client = createLangfuseClient(resolveLangfuseConfig(process.env));
  const [baselineRun, candidateRun] = await Promise.all([
    client.getRun(options.dataset, options.baselineRun),
    client.getRun(options.dataset, options.candidateRun),
  ]);
  const [baselineTraces, candidateTraces] = await Promise.all(
    [baselineRun, candidateRun].map(run =>
      Promise.all(run.datasetRunItems.map(item => client.getTrace(item.traceId)))
    )
  );
  const pairs = pairRunItems(baselineRun, candidateRun, baselineTraces, candidateTraces);
  await writeFile(
    outputPath,
    renderReport({
      dataset: options.dataset,
      baselineRun: options.baselineRun,
      candidateRun: options.candidateRun,
      baselineLabel: options.baselineLabel,
      candidateLabel: options.candidateLabel,
      pairs,
    })
  );
  process.stdout.write(`Wrote ${pairs.length} paired summaries to ${outputPath}\n`);
}

function usage() {
  return 'Usage: compare-summaries-with-html.mjs --dataset <name> --baseline-run <name> --candidate-run <name> --output <absolute-path> [--baseline-label <label>] [--candidate-label <label>]';
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
