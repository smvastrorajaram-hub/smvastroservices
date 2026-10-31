import { appendFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import { createFirestoreAdminRestClient } from '../../../shared/backend-platform/firestore-admin-rest.mjs';
import {
  createStrictReadOnlyD1Guard,
  createWalletLiveReadOnlyAudit
} from '../../../shared/backend-platform/wallet-live-readonly-audit.mjs';

const PROJECT_ID = 'smv-astro-staging';
const PAGE_SIZE = 100;
const MAX_PAGE_REQUESTS = 100000;
const credentialsText = String(
  process.env.FIREBASE_STAGING_SERVICE_ACCOUNT_JSON ||
  process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
  ''
).trim();

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function safeErrorCode(error) {
  const value = String(error?.code || 'WALLET_LIVE_AUDIT_FAILED');
  return /^[A-Z0-9_:-]{1,100}$/.test(value) ? value : 'WALLET_LIVE_AUDIT_FAILED';
}

if (!credentialsText) {
  fail('FIREBASE_STAGING_SERVICE_ACCOUNT_JSON (or FIREBASE_SERVICE_ACCOUNT_JSON) is required.');
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
    fail('Refusing audit: credentials must be complete and belong only to smv-astro-staging.');
  }

  if (credentials && process.exitCode !== 1) {
    try {
      const firestore = createFirestoreAdminRestClient({
        projectId: PROJECT_ID,
        allowedProjectIds: [PROJECT_ID],
        credentials
      });
      const audit = createWalletLiveReadOnlyAudit({
        firestore,
        db: createStrictReadOnlyD1Guard(),
        expectedProjectId: PROJECT_ID,
        pageSize: PAGE_SIZE,
        maxPageRequests: MAX_PAGE_REQUESTS,
        cryptoImpl: webcrypto
      });
      const report = await audit.run();

      for (const collection of report.collections) {
        console.log(JSON.stringify({
          collection: collection.collection,
          sourceCollection: collection.sourceCollection,
          pagesScanned: collection.pagesScanned,
          totalSourceDocuments: collection.totalSourceDocuments,
          domainMappableRecords: collection.domainMappableRecords,
          rawArchiveOnlyRecords: collection.rawArchiveOnlyRecords,
          outOfScopeRecords: collection.outOfScopeRecords,
          unmappableRecords: collection.unmappableRecords,
          sensitivePayloadRecords: collection.sensitivePayloadRecords,
          warningCounts: collection.warningCounts,
          relatedRecordsConsistency: collection.relatedRecordsConsistency,
          duplicateOrIdempotencyConflicts: collection.duplicateOrIdempotencyConflicts,
          plannedD1Statements: collection.plannedD1Statements,
          plannedD1StatementKinds: collection.plannedD1StatementKinds,
          writesPerformed: 0,
          complete: collection.complete
        }));
      }

      console.log(JSON.stringify({
        sourceProjectId: report.sourceProjectId,
        mode: report.mode,
        complete: report.complete,
        totals: report.totals,
        relatedRecordsConsistency: report.relatedRecordsConsistency,
        financialReconciliation: report.financialReconciliation,
        securityBlockers: report.securityBlockers,
        writesPerformed: 0,
        sourceWritesPerformed: 0,
        sourceDeletesPerformed: 0,
        personalDataReturned: false,
        credentialsReturned: false,
        cutoverSafe: false
      }));

      const summary = [
        '# SMV ASTRO Wallet + Live historical migration — read-only audit',
        '',
        '- Firebase source: smv-astro-staging only',
        '- Mode: full pagination, including all mixed-collection source documents',
        '- Live children: messages and signals scanned under every discovered Live Session',
        '- D1 writes: **0** (strict write guard enabled; no live D1 binding supplied)',
        '- Firestore writes/deletes: **0**',
        '- Source data deleted: **no**',
        '- Personal data or credentials included in report: **no**',
        '- Cutover readiness: **not declared; cutoverSafe=false**',
        '',
        '| Source collection | Pages | Source docs | Domain mapped | Raw archive only | Out of scope | Unmappable | Warnings | Planned D1 statements | Writes |',
        '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|',
        ...report.collections.map(item => [
          item.sourceCollection,
          item.pagesScanned,
          item.totalSourceDocuments,
          item.domainMappableRecords,
          item.rawArchiveOnlyRecords,
          item.outOfScopeRecords,
          item.unmappableRecords,
          item.warningCount,
          item.plannedD1Statements,
          0
        ].join(' | ')),
        '',
        '**Totals:** ' + report.totals.collections + ' collection groups; ' +
          report.totals.pagesScanned + ' pages; ' + report.totals.sourceDocuments +
          ' source documents; ' + report.totals.domainMappableRecords + ' domain-mappable; ' +
          report.totals.rawArchiveOnlyRecords + ' raw archive-only; ' +
          report.totals.outOfScopeRecords + ' out of scope; ' +
          report.totals.unmappableRecords + ' unmappable; ' +
          report.totals.plannedD1Statements + ' planned D1 statements; **0 writes**.',
        '',
        '## Related-record consistency',
        '',
        '| Check | Count |',
        '|---|---:|',
        ...Object.entries(report.relatedRecordsConsistency.missingReferences).map(([name, count]) =>
          '| ' + name + ' | ' + count + ' |'
        ),
        ...Object.entries(report.relatedRecordsConsistency.duplicateOrIdempotencyConflicts).map(([name, count]) =>
          '| ' + name + ' | ' + count + ' |'
        ),
        '',
        '## Readiness blockers',
        '',
        ...report.securityBlockers.map(item => '- ' + item),
        '',
        '',
        '## Financial reconciliation',
        '',
        '- Wallet snapshot checks: ' + report.financialReconciliation.walletBalance.balanceSnapshotsChecked +
          '; mismatches: ' + report.financialReconciliation.walletBalance.snapshotMismatches +
          '; non-initial wallets without ledger: ' + report.financialReconciliation.walletBalance.nonInitialWalletsMissingLedger,
        '- Paid recharge consistency: ' + report.financialReconciliation.paidRecharge.paidRechargesChecked +
          ' paid recharges checked; missing order: ' + report.financialReconciliation.paidRecharge.missingWalletRechargeOrders +
          '; missing credit ledger: ' + report.financialReconciliation.paidRecharge.missingRechargeCreditLedger +
          '; amount conflicts: ' + report.financialReconciliation.paidRecharge.rechargeCreditAmountMismatches,
        '- Live reservation/settlement: missing reserve ledger: ' +
          report.financialReconciliation.liveReservationSettlement.sessionsMissingReservationLedger +
          '; missing usage ledger: ' + report.financialReconciliation.liveReservationSettlement.endedSessionsMissingUsageLedger +
          '; missing cash release: ' + report.financialReconciliation.liveReservationSettlement.sessionsMissingCashReleaseLedger +
          '; bonus settlement mismatch: ' + report.financialReconciliation.liveReservationSettlement.sessionBonusMinutesNotReconciled,
        '- Commission setting valid: ' + report.financialReconciliation.billingConfiguration.commissionPercentValid,
        '- Missing billing settings: ' + (report.financialReconciliation.billingConfiguration.missingSettings.join(', ') || 'none'),
        '- Withdrawals checked: ' + report.financialReconciliation.withdrawal.withdrawalsChecked +
          '; invalid amounts: ' + report.financialReconciliation.withdrawal.withdrawalsWithInvalidAmount,
        '',
        '| Status group | State counts |',
        '|---|---|',
        ...Object.entries(report.financialReconciliation.statusCounts).map(([name, values]) =>
          '| ' + name + ' | ' + Object.entries(values).map(([state, count]) => state + ': ' + count).join(', ') + ' |'
        ),
        '',
        'This audit does not authorize import, cutover, or production changes.'
      ].join('\n');

      if (process.env.GITHUB_STEP_SUMMARY) {
        appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary + '\n');
      }
      console.log('WALLET_LIVE_READ_ONLY_AUDIT_COMPLETE');
    } catch (error) {
      fail('Wallet + Live read-only audit stopped safely (' + safeErrorCode(error) +
        '). No D1 or Firestore writes/deletes were executed.');
    }
  }
}
