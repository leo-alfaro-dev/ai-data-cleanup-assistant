import { spawnSync } from 'node:child_process';

const OPENROUTER_KEY_PATTERN = 'sk-or-[A-Za-z0-9_-]{20,}';

const locations = new Set([
  ...findKeyLocations({ isStaged: false }),
  ...findKeyLocations({ isStaged: true }),
]);

if (locations.size > 0) {
  console.error(
    'OpenRouter key found. Remove it, and revoke it if it was ever committed:'
  );
  for (const location of locations) console.error(`  ${location}`);
  process.exit(1);
}

// Prints file:line only, so the scan never echoes the key into terminal or CI logs.
function findKeyLocations(args: { isStaged: boolean }): string[] {
  const scope = args.isStaged ? ['--cached'] : [];
  const search = spawnSync(
    'git',
    ['grep', ...scope, '-I', '-n', '-E', OPENROUTER_KEY_PATTERN],
    { encoding: 'utf8' }
  );

  const hasNoMatch = search.status === 1;
  if (hasNoMatch) return [];

  if (search.status !== 0) throw new Error(`git grep failed: ${search.stderr}`);

  return search.stdout
    .split('\n')
    .filter(Boolean)
    .map((line) => line.split(':').slice(0, 2).join(':'));
}
