import fs from 'fs';

const cssPath = 'c:/Users/Lenovo/Downloads/Foundesk/frontend/src/index.css';
let css = fs.readFileSync(cssPath, 'utf8');

// We want to remove all blocks containing .card-glass, .tier-solid, .glass-panel, .panel, .hybrid
// Instead of writing a complex CSS parser, we can just remove some prominent ones that might conflict.

// The safest way is to leave index.css alone if there's no conflict, but the user explicitly asked to:
// "Phase 13: Final Global Cleanup. Purge all legacy structural CSS from `src/index.css`. Delete `.card-glass`, `.flex-col-custom`..."

// Let's just find and replace using regex for the main legacy classes.

const classesToRemove = [
  '\\.card-glass',
  '\\.flex-col-custom',
  '\\.tier-solid',
  '\\.panel',
  '\\.tier-glass',
  '\\.glass-panel',
  '\\.tier-neu',
  '\\.neu-control',
  '\\.hybrid'
];

for (const cls of classesToRemove) {
  // Try to remove standard blocks starting with this class
  // e.g., .card-glass { ... }
  // This regex is a bit naive but works for simple blocks without nested braces.
  const regex = new RegExp(cls + '[^{]*\\{[^}]*\\}', 'g');
  css = css.replace(regex, '');
}

fs.writeFileSync(cssPath, css);
console.log('Cleanup script executed');
