import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Wrangler's Workers bundle can select iconv-lite's browser fallbacks even when
 * nodejs_compat exposes the Node runtime. Those false aliases remove the
 * Node stream helpers that iconv-lite calls when process.versions.node exists.
 *
 * Keep the Node implementation available for the server-side Worker bundle.
 * This changes installed package metadata only; it does not modify dependency
 * versions or application source.
 */
export function removeWorkersIncompatibleBrowserAliases(manifest) {
  if (manifest?.name !== 'iconv-lite' || !manifest.browser || typeof manifest.browser !== 'object') {
    return false;
  }

  let changed = false;
  for (const alias of Object.keys(manifest.browser)) {
    if (alias === 'stream' || alias.endsWith('/streams') || alias.endsWith('/extend-node')) {
      delete manifest.browser[alias];
      changed = true;
    }
  }

  if (changed && Object.keys(manifest.browser).length === 0) {
    delete manifest.browser;
  }

  return changed;
}

async function patchInstalledPackages(rootNodeModules) {
  let patched = 0;
  let inspected = 0;

  async function walk(directory) {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      if (error?.code === 'ENOENT' || error?.code === 'EACCES') return;
      throw error;
    }

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.isSymbolicLink() || entry.name === '.bin') continue;
      const packageDirectory = join(directory, entry.name);

      if (entry.name === 'iconv-lite') {
        const manifestPath = join(packageDirectory, 'package.json');
        try {
          const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
          inspected += 1;
          if (removeWorkersIncompatibleBrowserAliases(manifest)) {
            await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
            patched += 1;
            console.log('[postinstall] Patched iconv-lite@' + String(manifest.version || 'unknown') +
              ' browser stream aliases for Cloudflare Workers.');
          }
        } catch (error) {
          if (error?.code !== 'ENOENT') throw error;
        }
        continue;
      }

      await walk(packageDirectory);
    }
  }

  await walk(rootNodeModules);
  console.log('[postinstall] iconv-lite packages inspected: ' + inspected + '; patched: ' + patched + '.');
  return { inspected, patched };
}

async function main() {
  await patchInstalledPackages(resolve(process.cwd(), 'node_modules'));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error('[postinstall] Unable to apply the Cloudflare iconv-lite compatibility patch:', error);
    process.exitCode = 1;
  });
}
