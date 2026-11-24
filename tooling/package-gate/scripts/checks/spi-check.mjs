import fs from 'node:fs';
import path from 'node:path';

const SOURCE_EXTENSIONS = new Set(['.swift', '.h', '.m', '.mm']);
const SPI_ATTRIBUTE = /@_spi\(\s*([A-Za-z0-9_]+)\s*\)/g;

/**
 * Test code is exempt: files inside a directory named Tests, Test, or
 * __tests__ (such as ios/Tests or packages/<name>/ios/Tests). File names
 * alone never exempt a file.
 */
export function isTestPath(relativePath) {
  const parts = relativePath.split('/');
  parts.pop();
  return parts.some((part) => /^(Tests?|__tests__)$/.test(part));
}

function walk(dir, repoRoot, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'build' || entry.name === 'Pods') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, repoRoot, out);
    else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      out.push(path.relative(repoRoot, full).split(path.sep).join('/'));
    }
  }
}

export function findSpiSites({ repoRoot, roots, forbidden }) {
  const files = [];
  for (const root of roots) {
    const dir = path.join(repoRoot, root);
    if (fs.existsSync(dir)) walk(dir, repoRoot, files);
  }
  const sites = [];
  for (const file of files.sort()) {
    if (isTestPath(file)) continue;
    const lines = fs
      .readFileSync(path.join(repoRoot, file), 'utf8')
      .split('\n');
    lines.forEach((text, index) => {
      const spis = [...text.matchAll(SPI_ATTRIBUTE)]
        .map((match) => match[1])
        .filter((name) => forbidden.includes(name));
      if (spis.length > 0) {
        sites.push({ file, lineNumber: index + 1, line: text.trim(), spis });
      }
    });
  }
  return sites;
}

const under = (file, roots) =>
  roots.some(
    (root) => root === '.' || file === root || file.startsWith(`${root}/`)
  );

/**
 * Compares found sites with the allowlist. A site passes only if an unused
 * allowlist entry has the same file and the same trimmed line. Entries under
 * `roots` that match nothing are stale and fail too, so the list only
 * shrinks.
 */
export function compareWithAllowlist({ sites, allowlist, roots }) {
  const remaining = allowlist.filter((entry) => under(entry.file, roots));
  const allowed = [];
  const violations = [];
  for (const site of sites) {
    const index = remaining.findIndex(
      (entry) => entry.file === site.file && entry.line === site.line
    );
    if (index === -1) {
      violations.push(site);
    } else {
      remaining.splice(index, 1);
      allowed.push(site);
    }
  }
  return { allowed, violations, stale: remaining };
}

export function checkSpi({ repoRoot, roots, allowlistFile }) {
  const { forbidden, sites: allowlist } = JSON.parse(
    fs.readFileSync(allowlistFile, 'utf8')
  );
  const sites = findSpiSites({ repoRoot, roots, forbidden });
  return { forbidden, ...compareWithAllowlist({ sites, allowlist, roots }) };
}
