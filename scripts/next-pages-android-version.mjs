import { appendFile } from 'node:fs/promises';

const repository = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
const envPath = process.env.GITHUB_ENV;
if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(String(repository || ''))) {
  throw new Error('GITHUB_REPOSITORY is missing; refusing to guess a Pages.dev Android version.');
}
if (!token || !envPath) {
  throw new Error('GITHUB_TOKEN and GITHUB_ENV are required to allocate the next permanent release version.');
}

const tags = [];
for (let page = 1; page <= 20; page += 1) {
  const response = await fetch(
    'https://api.github.com/repos/' + repository + '/releases?per_page=100&page=' + page,
    {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: 'Bearer ' + token,
        'X-GitHub-Api-Version': '2022-11-28'
      },
      cache: 'no-store'
    }
  );
  if (!response.ok) throw new Error('Could not read Pages.dev Android release history (HTTP ' + response.status + ').');
  const releases = await response.json();
  if (!Array.isArray(releases)) throw new Error('GitHub release history is invalid.');
  for (const release of releases) if (typeof release.tag_name === 'string') tags.push(release.tag_name);
  if (releases.length < 100) break;
  if (page === 20) throw new Error('GitHub release history exceeded the safe pagination limit.');
}

let highestCode = 0;
for (const tag of tags) {
  const match = /^smv-pages-android-v([1-9][0-9]*)\.([0-9]{1,3})-run-[0-9]+$/.exec(tag);
  if (!match) continue;
  const code = Number(match[1]) * 1000 + Number(match[2]);
  if (Number.isSafeInteger(code) && code > highestCode) highestCode = code;
}
const nextCode = highestCode === 0
  ? 1000
  : (highestCode % 1000 === 999
      ? (Math.floor(highestCode / 1000) + 1) * 1000
      : highestCode + 1);
if (!Number.isSafeInteger(nextCode) || nextCode > 2100000000) {
  throw new Error('Next Pages.dev Android versionCode is outside the supported range.');
}
const major = Math.floor(nextCode / 1000);
const minor = nextCode % 1000;
const versionName = 'v' + major + '.' + minor;
await appendFile(envPath, 'SMV_PAGES_ANDROID_VERSION_NAME=' + versionName + '\n', { encoding: 'utf8' });
process.stdout.write('Allocated next Pages.dev Android release ' + versionName + ' (versionCode ' + nextCode + ').\n');
