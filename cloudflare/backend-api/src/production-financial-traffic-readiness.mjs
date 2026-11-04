'use strict';

export function isProductionFinancialTrafficRoutingEnabled(state = {}) {
  return state.environment === 'production' &&
    state.backendActive === true &&
    state.schemaReady === true &&
    state.firebaseConnected === true &&
    state.walletReadRoutesEnabled === true &&
    state.walletRechargeRoutesEnabled === true &&
    state.walletRechargeMode === 'live' &&
    state.walletOfferRoutesEnabled === true &&
    state.liveCallChatRoutesEnabled === true &&
    state.identityProfileD1AuthorizationEnabled === true &&
    state.identityProfileD1AuthorizationReady === true &&
    state.razorpayMode === 'live' &&
    state.razorpayCredentialsConfigured === true &&
    state.razorpayProviderConnectionVerified === true;
}
