import {Platform} from 'react-native';
import Purchases, {CustomerInfo, PurchasesOffering, PurchasesPackage} from 'react-native-purchases';

const REVENUECAT_API_KEY_IOS = 'appl_snkfUBVLQzqPoKmAJQZpEevfQyz';
const REVENUECAT_API_KEY_ANDROID = 'goog_dgEJPNCGVQyGbgonPYyTOtTWcHr';

export const PREMIUM_ENTITLEMENT_ID = 'Zingg Premium';

let configured = false;

export function configurePurchases() {
  if (configured) {return;}
  Purchases.configure({
    apiKey: Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID,
  });
  configured = true;
}

export async function loginPurchases(userId: string): Promise<CustomerInfo> {
  const {customerInfo} = await Purchases.logIn(userId);
  return customerInfo;
}

export async function logoutPurchases(): Promise<void> {
  try {
    await Purchases.logOut();
  } catch {
    // no-op: fails harmlessly if no user was ever logged in
  }
}

export function isPremiumActive(customerInfo: CustomerInfo): boolean {
  return typeof customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== 'undefined';
}

export async function getCustomerInfo(): Promise<CustomerInfo> {
  return Purchases.getCustomerInfo();
}

export async function getCurrentOffering(): Promise<PurchasesOffering | null> {
  const offerings = await Purchases.getOfferings();
  return offerings.current;
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo> {
  const {customerInfo} = await Purchases.purchasePackage(pkg);
  return customerInfo;
}

export async function restorePurchases(): Promise<CustomerInfo> {
  return Purchases.restorePurchases();
}
