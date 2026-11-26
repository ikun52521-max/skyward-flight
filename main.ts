// main.ts — Ember Ridge Run entrypoint (Node 22, standard library only).
// Copies game/ and screenshots/ into the output directory and writes
// /output/dossier.json with buildDossier from vendor/makefun-game.ts.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output.

import { buildDossier } from './vendor/makefun-game.ts';
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname ?? '.');
const OUT = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 256 * 1024 },
  game_max_files: 993,
  game_max_bytes: 48 * 1024 * 1024,
  game_path_max_bytes: 1000,
};

function fail(message: string): never {
  console.error(`main.ts: ${message}`);
  process.exit(1);
}

function main(): void {
  const gameDir = join(ROOT, 'game');
  const shotsDir = join(ROOT, 'screenshots');
  if (!existsSync(gameDir)) fail('game/ is missing from the repository');
  if (!existsSync(shotsDir)) fail('screenshots/ is missing from the repository');

  // Never remove OUT itself: in the grader it is a mount point (/output)
  // and removing it fails with EBUSY. Clear only its children instead.
  mkdirSync(OUT, { recursive: true });
  for (const child of readdirSync(OUT)) {
    rmSync(join(OUT, child), { recursive: true, force: true });
  }

  cpSync(gameDir, join(OUT, 'game'), { recursive: true });
  cpSync(shotsDir, join(OUT, 'screenshots'), { recursive: true });

  const dossier = buildDossier(OUT, DOSSIER_CAPS);
  writeFileSync(join(OUT, 'dossier.json'), dossier);
  console.log(`main.ts: wrote ${OUT} (dossier.json ${dossier.length} bytes)`);
}

main();
