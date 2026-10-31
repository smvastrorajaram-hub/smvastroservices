-- Assertions are returned as booleans and checked by verify-d1-staging-migration-compatibility.mjs.
SELECT
  ((SELECT COUNT(*) FROM smv_domain_outbox
     WHERE event_id='legacy-outbox-keep-001' AND delivery_status='pending')=1)
    AS legacy_outbox_preserved,
  NOT EXISTS (SELECT 1 FROM pragma_table_info('smv_domain_outbox') WHERE name='status')
    AS legacy_outbox_schema_unchanged,
  ((SELECT COUNT(*) FROM smv_domain_idempotency
     WHERE idempotency_key='legacy-request-keep-001' AND completed_at_ms=2000)=1)
    AS legacy_idempotency_preserved,
  NOT EXISTS (SELECT 1 FROM pragma_table_info('smv_domain_idempotency') WHERE name='expires_at_ms')
    AS legacy_idempotency_schema_unchanged,
  (EXISTS (SELECT 1 FROM sqlite_schema WHERE type='table' AND name='smv_domain_event_outbox')
    AND EXISTS (SELECT 1 FROM pragma_table_info('smv_domain_event_outbox') WHERE name='outbox_id')
    AND EXISTS (SELECT 1 FROM pragma_table_info('smv_domain_event_outbox') WHERE name='event_key')
    AND EXISTS (SELECT 1 FROM pragma_table_info('smv_domain_event_outbox') WHERE name='status')
    AND EXISTS (SELECT 1 FROM pragma_table_info('smv_domain_event_outbox') WHERE name='next_attempt_at_ms')
    AND EXISTS (SELECT 1 FROM sqlite_schema WHERE type='index' AND name='idx_smv_domain_event_outbox_pending'))
    AS new_event_outbox_ready,
  (EXISTS (SELECT 1 FROM sqlite_schema WHERE type='table' AND name='smv_domain_request_idempotency')
    AND EXISTS (SELECT 1 FROM pragma_table_info('smv_domain_request_idempotency') WHERE name='scope')
    AND EXISTS (SELECT 1 FROM pragma_table_info('smv_domain_request_idempotency') WHERE name='expires_at_ms')
    AND EXISTS (SELECT 1 FROM sqlite_schema WHERE type='index' AND name='idx_smv_domain_request_idempotency_expiry'))
    AS new_request_idempotency_ready,
  ((SELECT COUNT(*) FROM d1_migrations WHERE name IN (
      '0002_shared_domain_repository.sql',
      '0003_notification_inbox.sql',
      '0004_wallet_offer_redemptions.sql',
      '0005_legacy_wallet_backfill.sql',
      '0006_d1_live_wallet_settlement.sql'
    ))=5) AS all_pending_migrations_applied,
  ((SELECT schema_version FROM smv_domain_schema_meta WHERE schema_key='shared-domain')
    ='0002_shared_domain_repository') AS shared_schema_marker_ready;
