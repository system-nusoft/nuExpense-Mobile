import React, {useCallback, useEffect, useState} from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform, I18nManager, Linking, Switch,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import type {CustomerInfo, PurchasesOffering} from 'react-native-purchases';
import {useAuth} from '../../contexts/AuthContext';
import {
  AI_DATA_PROCESSOR_NAME,
  PRIVACY_POLICY_URL,
  SUPPORT_EMAIL,
  TERMS_OF_USE_URL,
} from '../../constants/legal';
import {getAiConsentStatus, setAiConsent} from '../../lib/aiConsent';
import api, {getApiErrorMessage} from '../../lib/api';
import AiConsentModal from '../../components/common/AiConsentModal';
import Icon from '../../components/common/Icon';
import LanguagePicker from '../../components/common/LanguagePicker';
import {
  PREMIUM_ENTITLEMENT_ID,
  getCustomerInfo,
  getCurrentOffering,
  purchasePackage,
  restorePurchases,
  isPremiumActive,
} from '../../lib/purchases';
import DeleteAccountModal from '../../components/common/DeleteAccountModal';

export default function SettingsScreen() {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const {user, logout, refreshUser} = useAuth();
  const [showDelete, setShowDelete] = useState(false);
  const [showAiConsent, setShowAiConsent] = useState(false);
  const [aiConsentGranted, setAiConsentGranted] = useState(false);
  const [name, setName] = useState(user?.name ?? '');
  const [currency, setCurrency] = useState(user?.homeCurrency ?? 'USD');
  const [saving, setSaving] = useState(false);
  const currencyChanged = currency.toUpperCase() !== user?.homeCurrency;

  const refreshAiConsent = useCallback(() => {
    getAiConsentStatus().then(status => {
      setAiConsentGranted(status === 'granted');
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshAiConsent();
    }, [refreshAiConsent]),
  );

  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [loadingOffering, setLoadingOffering] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [info, off] = await Promise.all([getCustomerInfo(), getCurrentOffering()]);
        setCustomerInfo(info);
        setOffering(off);
      } catch {
        // offline or SDK not ready - premium section falls back to user.isPremium
      } finally {
        setLoadingOffering(false);
      }
    })();
  }, []);

  const isPremium = customerInfo ? isPremiumActive(customerInfo) : (user?.isPremium ?? false);
  const activeEntitlement = customerInfo?.entitlements.active[PREMIUM_ENTITLEMENT_ID];
  const activeUntilLabel = activeEntitlement?.expirationDate
    ? t('premium.activeUntil', {date: new Date(activeEntitlement.expirationDate).toLocaleDateString()})
    : null;

  async function handlePurchase() {
    const pkg = offering?.availablePackages[0];
    if (!pkg) {return;}
    setPurchasing(true);
    try {
      const info = await purchasePackage(pkg);
      setCustomerInfo(info);
      await refreshUser();
    } catch (err: any) {
      if (!err?.userCancelled) {
        Alert.alert(t('common.error'), t('premium.purchaseError'));
      }
    } finally {
      setPurchasing(false);
    }
  }

  async function handleRestore() {
    setRestoring(true);
    try {
      const info = await restorePurchases();
      setCustomerInfo(info);
      await refreshUser();
      Alert.alert(isPremiumActive(info) ? t('premium.restoreSuccess') : t('premium.restoreNone'));
    } catch {
      Alert.alert(t('common.error'), t('premium.purchaseError'));
    } finally {
      setRestoring(false);
    }
  }

  async function handleSave() {
    if (!name.trim() || !currency.trim()) {
      Alert.alert(t('common.error'), t('settings.errorRequired'));
      return;
    }
    setSaving(true);
    try {
      await api.patch('/users/me', {name: name.trim(), homeCurrency: currency.toUpperCase()});
      await refreshUser();
      Alert.alert(t('settings.savedTitle'), t('settings.savedMessage'));
    } catch (err) {
      Alert.alert(t('common.error'), getApiErrorMessage(err, t('settings.errorSave')));
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    Alert.alert(t('settings.logout'), t('settings.logoutConfirmMessage'), [
      {text: t('common.cancel'), style: 'cancel'},
      {text: t('settings.logout'), style: 'destructive', onPress: () => logout()},
    ]);
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, {paddingTop: insets.top + 12}]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <View style={styles.backRow}>
            <Icon
              name={I18nManager.isRTL ? 'chevron-right' : 'chevron-left'}
              size={20}
              color="#3e6378"
            />
            <Text style={styles.backText}>{t('settings.back')}</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.title}>{t('settings.title')}</Text>
        <View style={{width: 60}} />
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.profile')}</Text>
          <Text style={styles.label}>{t('settings.fullNameLabel')}</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder={t('settings.fullNamePlaceholder')} placeholderTextColor="#9CA3AF" />
          <Text style={styles.label}>{t('settings.homeCurrencyLabel')}</Text>
          <TextInput
            style={styles.input}
            value={currency}
            onChangeText={v => setCurrency(v.toUpperCase())}
            placeholder="USD"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="characters"
            maxLength={3}
          />
          {currencyChanged && (
            <View style={styles.warning}>
              <Icon name="alert-triangle" size={16} color="#B45309" style={{marginTop: 1}} />
              <Text style={styles.warningText}>
                {t('settings.currencyWarning')}
              </Text>
            </View>
          )}
          <TouchableOpacity style={[styles.saveBtn, saving && {opacity: 0.6}]} onPress={handleSave} disabled={saving}>
            <Text style={styles.saveBtnText}>{saving ? t('settings.saving') : t('settings.saveChanges')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
          <LanguagePicker />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('premium.sectionTitle')}</Text>
          {loadingOffering ? (
            <Text style={styles.infoLabel}>{t('premium.loadingOffering')}</Text>
          ) : isPremium ? (
            <>
              <View style={styles.premiumActiveRow}>
                <Icon name="check-circle" size={16} color="#3fa89d" />
                <Text style={styles.infoValue}>{t('premium.activeLabel')}</Text>
              </View>
              {activeUntilLabel && <Text style={styles.infoLabel}>{activeUntilLabel}</Text>}
              <TouchableOpacity
                style={styles.manageBtn}
                onPress={() =>
                  Linking.openURL(
                    Platform.OS === 'ios'
                      ? 'https://apps.apple.com/account/subscriptions'
                      : 'https://play.google.com/store/account/subscriptions',
                  )
                }>
                <Text style={styles.restoreText}>{t('premium.manageSubscriptionButton')}</Text>
              </TouchableOpacity>
            </>
          ) : offering?.availablePackages.length ? (
            <TouchableOpacity
              style={[styles.saveBtn, purchasing && {opacity: 0.6}]}
              onPress={handlePurchase}
              disabled={purchasing}>
              <Text style={styles.saveBtnText}>
                {purchasing ? t('settings.saving') : t('premium.upgradeButton')}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.infoLabel}>{t('premium.offeringUnavailable')}</Text>
          )}
          <TouchableOpacity onPress={handleRestore} disabled={restoring} style={styles.restoreBtn}>
            <Text style={styles.restoreText}>
              {restoring ? t('settings.saving') : t('premium.restoreButton')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.account')}</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('settings.emailLabel')}</Text>
            <Text style={styles.infoValue}>{user?.email}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('aiConsent.settingsTitle')}</Text>
          <View style={styles.aiRow}>
            <View style={styles.aiCopy}>
              <Text style={styles.legalRowText}>
                {t('aiConsent.settingsSubtitle', {provider: AI_DATA_PROCESSOR_NAME})}
              </Text>
              <Text style={styles.aiStatus}>
                {aiConsentGranted ? t('aiConsent.enabled') : t('aiConsent.disabled')}
              </Text>
            </View>
            <Switch
              value={aiConsentGranted}
              onValueChange={next => {
                if (next) {
                  setShowAiConsent(true);
                  return;
                }
                setAiConsent('denied').then(() => setAiConsentGranted(false));
              }}
              trackColor={{false: '#D1D5DB', true: '#81a8c0'}}
              thumbColor={aiConsentGranted ? '#3e6378' : '#f4f3f4'}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('legal.sectionTitle')}</Text>
          <TouchableOpacity style={[styles.legalRow, styles.legalRowFirst]} onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
            <Text style={styles.legalRowText}>{t('legal.privacy')}</Text>
            <Icon name="chevron-right" size={16} color="#9CA3AF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.legalRow} onPress={() => Linking.openURL(TERMS_OF_USE_URL)}>
            <Text style={styles.legalRowText}>{t('legal.terms')}</Text>
            <Icon name="chevron-right" size={16} color="#9CA3AF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.legalRow}
            onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}>
            <Text style={styles.legalRowText}>{t('legal.support')}</Text>
            <Icon name="chevron-right" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>{t('settings.logout')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteAccountBtn} onPress={() => setShowDelete(true)}>
          <Text style={styles.deleteAccountText}>{t('deleteAccount.button')}</Text>
        </TouchableOpacity>
        <Text style={styles.deleteAccountHint}>{t('deleteAccount.body')}</Text>
      </ScrollView>
      <DeleteAccountModal visible={showDelete} onClose={() => setShowDelete(false)} />
      <AiConsentModal
        visible={showAiConsent}
        onAllow={async () => {
          await setAiConsent('granted');
          setAiConsentGranted(true);
          setShowAiConsent(false);
        }}
        onDeny={async () => {
          await setAiConsent('denied');
          setAiConsentGranted(false);
          setShowAiConsent(false);
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1, backgroundColor: '#F9FAFB'},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingHorizontal: 16, paddingBottom: 12},
  backBtn: {width: 70},
  backRow: {flexDirection: 'row', alignItems: 'center', gap: 2},
  backText: {fontSize: 16, color: '#3e6378', fontWeight: '500'},
  title: {fontSize: 17, fontWeight: '700', color: '#111827'},
  content: {padding: 16, gap: 16, paddingBottom: 40},
  aiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  aiCopy: {flex: 1, gap: 4},
  aiStatus: {fontSize: 12, color: '#6B7280', fontWeight: '600'},
  section: {backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 4},
  sectionTitle: {fontSize: 13, fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8},
  label: {fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 4},
  input: {backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: '#111827', marginBottom: 12},
  warning: {backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FCD34D', borderRadius: 10, padding: 12, marginBottom: 12, flexDirection: 'row', gap: 8, alignItems: 'flex-start'},
  warningText: {flex: 1, fontSize: 13, color: '#92400E', lineHeight: 18},
  saveBtn: {backgroundColor: '#3e6378', borderRadius: 12, paddingVertical: 13, alignItems: 'center'},
  saveBtnText: {color: '#fff', fontWeight: '600', fontSize: 15},
  infoRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, gap: 8},
  premiumActiveRow: {flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8},
  infoLabel: {fontSize: 14, color: '#6B7280'},
  infoValue: {fontSize: 14, color: '#111827', fontWeight: '500'},
  restoreBtn: {marginTop: 12, alignItems: 'center'},
  manageBtn: {marginTop: 10, alignItems: 'flex-start'},
  restoreText: {fontSize: 13, color: '#3e6378', fontWeight: '500'},
  legalRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  legalRowFirst: {borderTopWidth: 0, paddingTop: 4},
  legalRowText: {fontSize: 15, color: '#111827', fontWeight: '500'},
  logoutBtn: {backgroundColor: '#fff', borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#FCA5A5'},
  logoutText: {color: '#EF4444', fontWeight: '600', fontSize: 15},
  deleteAccountBtn: {marginTop: 16, paddingVertical: 12, alignItems: 'center'},
  deleteAccountText: {color: '#DC2626', fontWeight: '600', fontSize: 14},
  deleteAccountHint: {fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginBottom: 24},
});
