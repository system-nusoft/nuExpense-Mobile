import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, I18nManager} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import {AppStackParamList} from '../../navigation/AppNavigator';
import Icon from './Icon';

type Variant = 'banner' | 'insights';

type Props = {
  variant?: Variant;
};

const FEATURES = ['featureRecap', 'featureInsights', 'featureAdFree'] as const;

/**
 * Quiet-finance premium invite for free users.
 * Deep ink + soft teal wash, no purple, no glassmorphism stack.
 */
export default function PremiumUpsellCard({variant = 'banner'}: Props) {
  const {t} = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  const isInsights = variant === 'insights';

  return (
    <View style={[styles.shell, isInsights && styles.shellInsights]}>
      <View style={styles.wash} pointerEvents="none" />
      <View style={styles.orb} pointerEvents="none" />
      <View style={styles.rule} />

      <Text style={styles.eyebrow}>{t('premium.upsell.eyebrow')}</Text>
      <Text style={styles.title}>
        {isInsights
          ? t('premium.upsell.insightsTitle')
          : t('premium.upsell.title')}
      </Text>
      <Text style={styles.body}>
        {isInsights
          ? t('premium.upsell.insightsBody')
          : t('premium.upsell.body')}
      </Text>

      <View style={styles.features}>
        {FEATURES.map(key => (
          <View key={key} style={styles.featureRow}>
            <View style={styles.dot} />
            <Text style={styles.featureText}>{t(`premium.upsell.${key}`)}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={styles.cta}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('Settings')}
      >
        <Text style={styles.ctaText}>{t('premium.upgradeButton')}</Text>
        <Icon
          name={I18nManager.isRTL ? 'chevron-left' : 'chevron-right'}
          size={18}
          color="#1A2F3A"
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: '#1A2F3A',
    borderRadius: 20,
    padding: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(129, 168, 192, 0.22)',
  },
  shellInsights: {
    marginTop: 0,
  },
  wash: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(63, 168, 157, 0.14)',
  },
  orb: {
    position: 'absolute',
    bottom: -50,
    left: -20,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(62, 99, 120, 0.45)',
  },
  rule: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#C4A574',
    marginBottom: 14,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: '#C4A574',
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F7FAFC',
    letterSpacing: -0.3,
    marginBottom: 8,
    lineHeight: 28,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(171, 197, 213, 0.92)',
    marginBottom: 16,
  },
  features: {
    gap: 8,
    marginBottom: 18,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3fa89d',
  },
  featureText: {
    fontSize: 13,
    color: '#E8EEF2',
    fontWeight: '500',
  },
  cta: {
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaText: {
    color: '#1A2F3A',
    fontSize: 15,
    fontWeight: '700',
  },
});
