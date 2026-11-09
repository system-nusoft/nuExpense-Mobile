import {Platform} from 'react-native';
import mobileAds, {AdsConsent, TestIds} from 'react-native-google-mobile-ads';

// Real banner ad units (AdMob). Debug builds always use Google's test unit
// so development never generates invalid traffic on the real units.
const BANNER_UNIT_ID = Platform.select({
  android: 'ca-app-pub-1078779997039449/3676127258',
  ios: 'ca-app-pub-1078779997039449/5037135370',
  default: TestIds.BANNER,
});

export const BANNER_AD_UNIT_ID = __DEV__ ? TestIds.BANNER : BANNER_UNIT_ID;

let initPromise: Promise<boolean> | null = null;

/**
 * Runs Google's consent flow (shows the form to EU/UK users when required),
 * then initializes the Mobile Ads SDK. Safe to call many times - runs once.
 * Resolves true when ads may be requested.
 */
export function initializeAds(): Promise<boolean> {
  if (!initPromise) {
    initPromise = (async () => {
      try {
        const info = await AdsConsent.gatherConsent();
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
