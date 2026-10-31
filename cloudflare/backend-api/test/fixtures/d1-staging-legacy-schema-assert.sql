-- All assertions run within one local D1 execution. CHECK failures make this step fail.
CREATE TEMP TABLE migration_assertion (ok INTEGER NOT NULL CHECK (ok = 1));

INSERT INTO migration_assertion
SELECT CASE WHEN
  (SELECT COUNT(*) FROM smv_domain_outbox
    WHERE event_id='legacy-outbox-keep-001' AND delivery_status='pending')=1
  AND NOT EXISTS (SELECT 1 FROM pragma_table_info('smv_domain_outbox') WHERE name='status')
  AND (SELECT COUNT(*) FROM smv_domain_idempotency
    WHERE idempotency_key='legacy-request-keep-001' AND completed_at_ms=2000)=1
  AND NOT EXISTS (SELECT 1 FROM pragma_table_info('smv_domain_idempotency') WHERE name='expires_at_ms')
THEN 1 ELSE 0 END;

INSERT INTO migration_assertion
SELECT CASE WHEN
  EXISTS (SELECT 1 FROM sqlite_schema WHERE type='table' AND name='smv_domain_event_outbox')
  AND EXISTS (SELECT 1 FROM pragma_table_info('smv_domain_event_outbox') WHERE name='outbox_id')
  AND EXISTS (SELECT 1 FROM pragma_table_info('smv_domain_event_outbox') WHERE name='event_key')
  AND EXISTS (SELECT 1 FROM pragma_table_info('smv_domain_event_outbox') WHERE name='status')
  AND EXISTS (SELECT 1 FROM pragma_table_info('smv_domain_event_outbox') WHERE name='next_attempt_at_ms')
  AND EXISTS (SELECT 1 FROM sqlite_schema WHERE type='index' AND name='idx_smv_domain_event_outbox_pending')
THEN 1 ELSE 0 END;

INSERT INTO migration_assertion
SELECT CASE WHEN
  EXISTS (SELECT 1 FROM sqlite_schema WHERE type='table' AND name='smv_domain_request_idempotency')
  AND EXISTS (SELECT 1 FROM pragma_table_info('smv_domain_request_idempotency') WHERE name='scope')
  AND EXISTS (SELECT 1 FROM pragma_table_info('smv_domain_request_idempotency') WHERE name='expires_at_ms')
  AND EXISTS (SELECT 1 FROM sqlite_schema WHERE type='index' AND name='idx_smv_domain_request_idempotency_expiry')
THEN 1 ELSE 0 END;

DROP TABLE migration_assertion;
