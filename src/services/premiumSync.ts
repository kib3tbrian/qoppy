import nativeBilling, { NativeBillingState } from './nativeBilling';

export const syncPremiumStatusFromBilling = async (): Promise<NativeBillingState | null> => {
  if (!nativeBilling.isAvailable()) {
    return null;
  }

  await nativeBilling.initialize();
  return nativeBilling.getCurrentState();
};

export const watchPremiumStatusFromBilling = (
  onState?: (state: NativeBillingState) => void
): (() => void) | null => {
  if (!nativeBilling.isAvailable()) {
    return null;
  }

  return nativeBilling.subscribe(state => {
    onState?.(state);
  });
};

export default {
  syncPremiumStatusFromBilling,
  watchPremiumStatusFromBilling,
};
