import React, {useEffect, useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {BannerAd, BannerAdSize} from 'react-native-google-mobile-ads';
import {useAuth} from '../../contexts/AuthContext';
import {BANNER_AD_UNIT_ID, initializeAds} from '../../lib/ads';

/** Anchored banner, shown to free users only. Renders nothing for Premium. */
export default function AdBanner() {
  const {user} = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    initializeAds().then(ok => {
      if (!cancelled) {setReady(ok);}
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!user || user.isPremium || !ready) {return null;}

  return (
    <View style={styles.container}>
      <BannerAd unitId={BANNER_AD_UNIT_ID} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {alignItems: 'center', backgroundColor: '#fff'},
});
