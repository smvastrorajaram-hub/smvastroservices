/**
 * Resolve administrator UID allowlists across legacy and explicitly configured
 * Worker bindings. The dedicated SMV variable avoids collisions with secrets.
 */
export function resolveConfiguredAdminUids(env = {}) {
  const values = [
    env.ADMIN_UID,
    ...String(env.ADMIN_UIDS || '').split(','),
    ...String(env.SMV_CONFIGURED_ADMIN_UIDS || '').split(',')
  ];
  return [...new Set(values.map(value => String(value || '').trim()).filter(Boolean))];
}
