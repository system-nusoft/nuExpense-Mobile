import {AppState, Platform} from 'react-native';
import mobileAds, {AdsConsent, TestIds} from 'react-native-google-mobile-ads';
import {check, PERMISSIONS, request, RESULTS} from 'react-native-permissions';

// Real banner ad units (AdMob). Debug builds always use Google's test unit
// so development never generates invalid traffic on the real units.
const BANNER_UNIT_ID = Platform.select({
  android: 'ca-app-pub-1078779997039449/3676127258',
  ios: 'ca-app-pub-1078779997039449/5037135370',
  default: TestIds.BANNER,
});

export const BANNER_AD_UNIT_ID = __DEV__ ? TestIds.BANNER : BANNER_UNIT_ID;

let initPromise: Promise<boolean> | null = null;

/** ATT only presents reliably when the app is foreground-active. */
function waitForAppActive(): Promise<void> {
  if (AppState.currentState === 'active') {
    return Promise.resolve();
  }
  return new Promise(resolve => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        sub.remove();
        resolve();
      }
    });
  });
}

/**
 * Shows Apple's App Tracking Transparency prompt when still undetermined.
 * Denial is fine — ads continue without IDFA / personalized tracking.
 */
async function requestAppTrackingTransparency(): Promise<void> {
  if (Platform.OS !== 'ios') {
    return;
  }
  try {
    await waitForAppActive();
    const status = await check(PERMISSIONS.IOS.APP_TRACKING_TRANSPARENCY);
    if (status === RESULTS.DENIED) {
      await request(PERMISSIONS.IOS.APP_TRACKING_TRANSPARENCY);
    }
  } catch {
    // Ads still work without tracking authorization.
  }
}

/**
 * Runs Google's consent flow (shows the form to EU/UK users when required),
 * requests ATT on iOS, then initializes the Mobile Ads SDK.
 * Safe to call many times - runs once. Resolves true when ads may be requested.
 */
export function initializeAds(): Promise<boolean> {
  if (!initPromise) {
    initPromise = (async () => {
      try {
        const info = await AdsConsent.gatherConsent();
        await requestAppTrackingTransparency();
        if (!info.canRequestAds) {
          return false;
        }
        await mobileAds().initialize();
        return true;
      } catch {
        return false;
      }
    })();
  }
  return initPromise;
}
