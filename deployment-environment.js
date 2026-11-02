'use strict';

const STAGING_SEGMENT = /(?:^|[-_])staging(?:$|[-_])/i;

function isStagingDeployment(env = process.env) {
  const nodeEnvironment = String(env.NODE_ENV || '').trim().toLowerCase();
  const firebaseProjectId = String(env.FIREBASE_PROJECT_ID || '').trim().toLowerCase();
  const renderServiceName = String(env.RENDER_SERVICE_NAME || '').trim();

  return nodeEnvironment === 'staging' ||
    firebaseProjectId === 'smv-astro-staging' ||
    STAGING_SEGMENT.test(renderServiceName);
}

module.exports = { isStagingDeployment };
