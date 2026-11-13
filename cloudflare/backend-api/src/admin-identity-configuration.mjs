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


/**
 * Resolve the canonical Admin Wallet UID used by Admin balance and settlement paths.
 * An explicit ADMIN_WALLET_UID wins. Otherwise only a unique configured Admin
 * is safe; multiple Admins require an explicit primary wallet owner.
 */
export function resolveConfiguredAdminWalletUid(env = {}) {
  const explicit = String(env.ADMIN_WALLET_UID || '').trim();
  if (explicit) return explicit;
  const configured = resolveConfiguredAdminUids(env);
  return configured.length === 1 ? configured[0] : '';
}
