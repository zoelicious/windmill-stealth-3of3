// main.ts — hands in The Windmill: copies game/ and screenshots/ to the output
// directory and writes dossier.json with buildDossier from vendor/makefun-game.ts.
// Runs on Node 22.18+ with no install: `MAKEFUN_OUTPUT_DIR=out node main.ts`.
import { buildDossier } from './vendor/makefun-game.ts';
import {
  existsSync, lstatSync, mkdirSync, readdirSync,
  readFileSync, rmSync, statSync, writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)));
const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

// Empty the output directory one entry at a time; never remove the directory itself.
function emptyDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    return;
  }
  for (const name of readdirSync(dir)) {
    const target = join(dir, name);
    const st = lstatSync(target);
    if (st.isDirectory() && !st.isSymbolicLink()) {
      emptyDir(target);
      // Directory is empty now; remove the shell.
      rmSync(target, { recursive: false });
    } else {
      rmSync(target, { force: true });
    }
  }
}

function copyTree(src: string, dest: string): void {
  mkdirSync(dest, { recursive: true });
  for (const name of readdirSync(src)) {
    const from = join(src, name);
    const to = join(dest, name);
    const st = statSync(from);
    if (st.isDirectory()) copyTree(from, to);
    else writeFileSync(to, readFileSync(from));
  }
}

function main(): void {
  emptyDir(outDir);
  copyTree(join(repoRoot, 'game'), join(outDir, 'game'));
  copyTree(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'));
  const dossier = buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
  });
  writeFileSync(join(outDir, 'dossier.json'), dossier);
  console.log(`wrote ${outDir} (dossier ${dossier.length} bytes)`);
}

main();
