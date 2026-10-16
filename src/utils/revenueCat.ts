/**
 * RevenueCat integration for iOS In-App Purchase.
 *
 * Only active when running as a native iOS Capacitor app.
 * On web and Android, all functions are safe no-ops.
 */
import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';

// RevenueCat iOS API key — replace with actual key from RevenueCat dashboard
// This is a placeholder; the real key will be added before App Store submission
const RC_IOS_API_KEY = 'appl_REPLACE_WITH_REAL_KEY';

// Product identifiers matching App Store Connect product IDs
export const RC_MONTHLY_ID = 'com.mymobileshop.pro.monthly';
export const RC_YEARLY_ID = 'com.mymobileshop.pro.yearly';

// Entitlement identifier configured in RevenueCat dashboard
export const RC_PRO_ENTITLEMENT = 'pro';

let _initialized = false;

/**
 * Initialize RevenueCat SDK. Call once on app mount for iOS native.
 * Safe to call on non-iOS platforms — returns immediately.
 */
export async function initRevenueCat(isiOS: boolean): Promise<void> {
  if (!isiOS || _initialized) return;
  try {
    await Purchases.setLogLevel({ level: LOG_LEVEL.ERROR });
    await Purchases.configure({
      apiKey: RC_IOS_API_KEY,
    });
    _initialized = true;
  } catch (err) {
    console.warn('[RevenueCat] init failed:', err);
  }
}

/**
 * Returns true when the user has an active Pro entitlement according to
 * RevenueCat. Returns false on non-iOS or if SDK not initialized.
 */
export async function checkRevenueCatEntitlement(): Promise<boolean> {
  if (!_initialized) return false;
  try {
    const { customerInfo } = await Purchases.getCustomerInfo();
    return RC_PRO_ENTITLEMENT in (customerInfo.entitlements.active ?? {});
  } catch (err) {
    console.warn('[RevenueCat] entitlement check failed:', err);
    return false;
  }
}

export interface RCOffering {
  monthly?: { identifier: string; priceString: string };
  yearly?: { identifier: string; priceString: string };
}

/**
 * Fetches available offerings from RevenueCat.
 * Returns empty object on non-iOS or error.
 */
export async function getRevenueCatOfferings(): Promise<RCOffering> {
  if (!_initialized) return {};
  try {
    const { current } = await Purchases.getOfferings();
    if (!current) return {};
    const result: RCOffering = {};
    const monthly = current.availablePackages.find(
      (p: any) => p.product?.identifier === RC_MONTHLY_ID
    );
    const yearly = current.availablePackages.find(
      (p: any) => p.product?.identifier === RC_YEARLY_ID
    );
    if (monthly?.product) {
      result.monthly = {
        identifier: monthly.identifier,
        priceString: monthly.product.priceString ?? '₹249/mo',
      };
    }
    if (yearly?.product) {
      result.yearly = {
        identifier: yearly.identifier,
        priceString: yearly.product.priceString ?? '₹2,499/yr',
      };
    }
    return result;
  } catch (err) {
    console.warn('[RevenueCat] getOfferings failed:', err);
    return {};
  }
}

/**
 * Triggers an in-app purchase for the given package identifier.
 * Returns { success: true, plan: 'monthly' | 'yearly' } on success.
 * Returns { success: false, cancelled: true } if user cancelled.
 * Returns { success: false } on error.
 */
export async function purchaseRevenueCat(
  packageIdentifier: string
): Promise<{ success: boolean; cancelled?: boolean; plan?: 'monthly' | 'yearly' }> {
  if (!_initialized) return { success: false };
  try {
    const { current } = await Purchases.getOfferings();
    if (!current) return { success: false };
    const pkg = current.availablePackages.find(
      (p: any) => p.identifier === packageIdentifier
    );
    if (!pkg) return { success: false };
    const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
    const active = RC_PRO_ENTITLEMENT in (customerInfo.entitlements.active ?? {});
    if (!active) return { success: false };
    // Determine which plan was purchased
    const plan: 'monthly' | 'yearly' = packageIdentifier.includes('monthly') ? 'monthly' : 'yearly';
    return { success: true, plan };
  } catch (err: any) {
    // PurchaseCancelledError has code 1 in RevenueCat
    if (err?.code === 1 || err?.message?.includes('cancel')) {
      return { success: false, cancelled: true };
    }
    console.warn('[RevenueCat] purchase failed:', err);
    return { success: false };
  }
}

/**
 * Restores previously purchased subscriptions.
 * Returns true if any Pro entitlement is now active.
 */
export async function restoreRevenueCatPurchases(): Promise<boolean> {
  if (!_initialized) return false;
  try {
    const { customerInfo } = await Purchases.restorePurchases();
    return RC_PRO_ENTITLEMENT in (customerInfo.entitlements.active ?? {});
  } catch (err) {
    console.warn('[RevenueCat] restore failed:', err);
    return false;
  }
}
