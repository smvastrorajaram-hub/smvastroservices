/* Resolve the latest owner-published permanent SMV ASTRO Android APK.
   Uploads are managed through GitHub Releases; no PAT or upload secret is exposed
   to public website visitors. The PWA install flow remains a separate feature. */
(function () {
  'use strict';
  const section = document.getElementById('smvPermanentAndroidAppSection');
  const download = document.getElementById('smvPermanentApkDownload');
  const upload = document.getElementById('smvPermanentApkUpload');
  const status = document.getElementById('smvPermanentApkStatus');
  if (!section || !download || !upload || !status) return;
  const repository = 'smvastrorajaram-hub/smvastroservices';
  const assetName = 'SMV-ASTRO-PERMANENT-RELEASE.apk';
  const latestReleaseApi = 'https://api.github.com/repos/' + repository + '/releases/latest';
  const uploadUrl = 'https://github.com/' + repository + '/releases/new';
  section.hidden = false;
  upload.href = uploadUrl;
  function dateLabel(value) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return '';
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  async function loadLatestApk() {
    try {
      const response = await fetch(latestReleaseApi, { headers: { Accept: 'application/vnd.github+json' }, cache: 'no-cache' });
      if (response.status === 404) {
        status.textContent = 'The first permanent APK has not been published yet. The Admin can upload the signed APK through “ADMIN: UPLOAD / UPDATE APK”.';
        return;
      }
      if (!response.ok) throw new Error('GitHub Releases returned HTTP ' + response.status + '.');
      const release = await response.json();
      if (!release || release.draft === true || release.prerelease === true) {
        status.textContent = 'A published permanent APK release is not available yet.';
        return;
      }
      const asset = Array.isArray(release.assets) ? release.assets.find(item => item && item.name === assetName && item.state === 'uploaded') : null;
      if (!asset || !asset.browser_download_url) {
        status.textContent = 'The latest published release does not contain ' + assetName + '. Upload the signed APK with this exact filename to the next release.';
        return;
      }
      const assetUrl = new URL(asset.browser_download_url);
      if (assetUrl.protocol !== 'https:' || assetUrl.hostname !== 'github.com' || !assetUrl.pathname.startsWith('/' + repository + '/releases/download/')) {
        throw new Error('The APK download URL does not belong to the SMV ASTRO repository.');
      }
      download.href = assetUrl.href;
      download.hidden = false;
      const released = dateLabel(release.published_at || release.created_at);
      status.textContent = 'Latest version: ' + String(release.tag_name || 'Permanent Release') + (released ? ' · Published ' + released : '') + '. On Android, download the APK, open the file, and confirm installation.';
    } catch (error) {
      console.warn('SMV ASTRO permanent APK status is unavailable:', error && (error.message || error));
      status.textContent = 'The APK release could not be checked right now. Try again later or open “View APK release history”.';
    }
  }
  loadLatestApk();
}());
