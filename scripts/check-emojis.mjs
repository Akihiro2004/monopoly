// Fails the build if any emoji or pictographic glyph appears in project source.
// Run via: npm run check:emoji
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = process.cwd();
const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', '.tmp']);
const ALLOWED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.md', '.html', '.css', '.json']);

// Emoji & pictographs: emoji blocks, variation selector, dingbats, dice faces,
// misc symbols & pictographs used as icons. Plain typographic arrows/math are allowed.
const EMOJI_PATTERN = new RegExp(
  [
    '[\\u{1F000}-\\u{1FAFF}]', // most emoji (incl. transport, shapes, supplemental)
    '[\\u{1F1E6}-\\u{1F1FF}]', // regional indicator flags
    '[\\u{2600}-\\u{27BF}]', // misc symbols + dingbats
    '[\\u{2B00}-\\u{2BFF}]', // misc symbols and arrows used as icons
    '[\\u{FE0F}]', // variation selector-16
    '[\\u{231A}-\\u{231B}]', // watch/hourglass
    '[\\u{23E9}-\\u{23FA}]', // media control symbols used as emoji
    '[\\u{2934}-\\u{2935}]', // curved arrows used as emoji
    '[\\u{2B05}-\\u{2B07}]', // directional arrows used as emoji
    '[\\u{3030}\\u{303D}]', // wavy dash / wave dash
    '[\\u{3297}\\u{3299}]', // japanese "congratulations"/"no good"
  ].join('|'),
  'gu'
);

function walk(dir, out) {
  for (const entry of readdirSync(dir)) {
    if (IGNORE_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, out);
    } else if (ALLOWED_EXTENSIONS.has(extname(entry))) {
      out.push(full);
    }
  }
  return out;
}

const files = walk(ROOT, []);
const violations = [];

for (const file of files) {
  const text = readFileSync(file, 'utf8');
  const matches = [...new Set(text.match(EMOJI_PATTERN) || [])];
  if (matches.length > 0) {
    const codepoints = matches.map((c) => 'U+' + c.codePointAt(0).toString(16).toUpperCase()).join(', ');
    violations.push(`${file.replace(ROOT + '/', '').replace(ROOT + '\\', '')}: ${codepoints}`);
  }
}

if (violations.length > 0) {
  console.error('Emoji detected in project source (emojis are not allowed):');
  for (const v of violations) console.error('  ' + v);
  process.exit(1);
}

console.log(`Emoji check passed: ${files.length} files scanned, 0 emoji found.`);
