import { appendFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import { createFirestoreAdminRestClient } from '../../../shared/backend-platform/firestore-admin-rest.mjs';
import {
  createIdentityProfileBackfillService,
  IDENTITY_PROFILE_SOURCE_COLLECTIONS
} from '../../../shared/backend-platform/d1-identity-profile-backfill.mjs';

const PROJECT_ID = 'smv-astro-staging';
const PAGE_SIZE = 25;
const MAX_PAGES_PER_COLLECTION = 2000;
const preflightOnly = process.argv.includes('--preflight');
const credentialsText = String(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim();

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

if (!credentialsText) {
  fail('FIREBASE_SERVICE_ACCOUNT_JSON is required for the staging-only read-only Identity/Profile preview.');
} else {
  let credentials;
  try {
    credentials = JSON.parse(credentialsText);
  } catch {
    fail('The configured Firebase staging service-account secret is not valid JSON.');
  }

  if (credentials && (
    credentials.project_id !== PROJECT_ID ||
    !String(credentials.client_email || '').trim() ||
    !String(credentials.private_key || '').trim()
  )) {
    fail('Refusing preview: credentials must be complete and belong only to smv-astro-staging.');
  }

  if (credentials && process.exitCode !== 1) {
    try {
      const firestore = createFirestoreAdminRestClient({
        projectId: PROJECT_ID,
        allowedProjectIds: [PROJECT_ID],
        credentials
      });

      // Preview methods only construct intended SQL writes; they do not execute them.
      // Any attempt to execute or batch a D1 write in this runner fails immediately.
      const db = Object.freeze({
        prepare(sql) {
          return Object.freeze({
            bind(...values) {
              return Object.freeze({ sql, values });
            }
          });
        },
        async batch() {
          throw new Error('READ_ONLY_PREVIEW_WRITE_GUARD');
        }
      });

      const service = createIdentityProfileBackfillService({
        db,
        firestore,
        sourceProjectId: PROJECT_ID,
        environment: 'staging',
        payoutEncryptionKey: String(process.env.SMV_IDENTITY_PAYOUT_ENCRYPTION_KEY || ''),
        payoutKeyVersion: String(process.env.SMV_IDENTITY_PAYOUT_KEY_VERSION || 'v1'),
        cryptoImpl: webcrypto
      });

      const report = [];
      for (const collection of Object.keys(IDENTITY_PROFILE_SOURCE_COLLECTIONS)) {
        let pageToken = '';
        let pages = 0;
        let sourceDocuments = 0;
        let mappableDocuments = 0;
        let plannedD1Statements = 0;
        const warnings = new Map();
        let complete = false;

        for (let index = 0; index < MAX_PAGES_PER_COLLECTION; index += 1) {
          const page = await service.previewPage({
            collection,
            pageSize: preflightOnly ? 1 : PAGE_SIZE,
            pageToken
          });
          pages += 1;
          sourceDocuments += Number(page.sourceDocuments || 0);
          mappableDocuments += Number(page.mappableDocuments || 0);
          plannedD1Statements += Number(page.plannedD1Statements || 0);
          for (const item of page.warningCounts || []) {
            const code = String(item.code || 'UNKNOWN_WARNING');
            warnings.set(code, (warnings.get(code) || 0) + Number(item.count || 0));
          }
          pageToken = String(page.nextPageToken || '');
          if (!pageToken || preflightOnly) {
            complete = !pageToken;
            break;
          }
        }

        const result = {
          collection,
          sourceCollection: IDENTITY_PROFILE_SOURCE_COLLECTIONS[collection],
          pagesPreviewed: pages,
          sourceDocuments,
          mappableDocuments,
          unmappableDocuments: sourceDocuments - mappableDocuments,
          plannedD1Statements,
          warningCounts: Object.fromEntries([...warnings.entries()].sort(([a], [b]) => a.localeCompare(b))),
          complete,
          preflightOnly,
          morePagesAvailable: preflightOnly && !!pageToken,
          writesPerformed: 0,
          personalDataReturned: false,
          sourceDataDeleted: false,
          cutoverSafe: false
        };
        report.push(result);
        console.log(JSON.stringify(result));

        if (!complete && !preflightOnly) {
          throw new Error('PAGE_LIMIT_REACHED:' + collection);
        }
      }

      const totals = report.reduce((sum, item) => ({
        collections: sum.collections + 1,
        pagesPreviewed: sum.pagesPreviewed + item.pagesPreviewed,
        sourceDocuments: sum.sourceDocuments + item.sourceDocuments,
        mappableDocuments: sum.mappableDocuments + item.mappableDocuments,
        unmappableDocuments: sum.unmappableDocuments + item.unmappableDocuments,
        plannedD1Statements: sum.plannedD1Statements + item.plannedD1Statements
      }), {
        collections: 0, pagesPreviewed: 0, sourceDocuments: 0,
        mappableDocuments: 0, unmappableDocuments: 0, plannedD1Statements: 0
      });

      const summary = [
        preflightOnly ? '## SMV ASTRO staging Identity/Profile read-only preflight' : '## SMV ASTRO staging Identity/Profile read-only preview',
        '',
        '- Firebase project: `smv-astro-staging`',
        preflightOnly ? '- Mode: first-page access preflight; only the first document page was checked for each collection' : '- Mode: full paginated read-only preview; no Firestore writes or D1 writes performed',
        '- Source data deleted: no',
        '- D1 authorization cutover: disabled',
        '',
        '| Collection | Pages | Source docs | Mappable | Unmappable | Warnings |',
        '|---|---:|---:|---:|---:|---|',
        ...report.map(item => [
          '`' + item.sourceCollection + '`',
          item.pagesPreviewed,
          item.sourceDocuments,
          item.mappableDocuments,
          item.unmappableDocuments,
          Object.entries(item.warningCounts).map(([code, count]) => code + ': ' + count).join('; ') || 'None'
        ].join(' | ')),
        '',
        preflightOnly ? '**Preflight totals:** ' + totals.collections + ' collections checked, ' + totals.sourceDocuments +
          ' documents sampled; this is not the final full preview.' : '**Totals:** ' + totals.collections + ' collections, ' + totals.pagesPreviewed +
          ' pages, ' + totals.sourceDocuments + ' documents; ' + totals.mappableDocuments +
          ' mappable, ' + totals.unmappableDocuments + ' unmappable.',
        '',
        'Warnings must be reviewed and resolved before any import. This report does not declare cutover safe.'
      ].join('\n');

      if (process.env.GITHUB_STEP_SUMMARY) {
        appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary + '\n');
      }
      console.log(preflightOnly ? 'READ_ONLY_PREVIEW_PREFLIGHT_COMPLETE' : 'READ_ONLY_PREVIEW_COMPLETE');
    } catch (error) {
      const code = String(error?.code || error?.message || 'PREVIEW_FAILED');
      fail('Read-only Identity/Profile preview failed safely (' + code + '). No D1 writes were executed.');
    }
  }
}
