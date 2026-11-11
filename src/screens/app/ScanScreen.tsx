import React, {useCallback, useEffect, useState} from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, Image, ScrollView, TextInput, ActivityIndicator,
  Platform, AppState,
} from 'react-native';
import {launchImageLibrary, launchCamera} from 'react-native-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {
  check, openSettings, PERMISSIONS, request, RESULTS,
} from 'react-native-permissions';
import {getCategoriesApi} from '../../lib/services/categories.service';
import {createExpenseApi} from '../../lib/services/expenses.service';
import {useAuth} from '../../contexts/AuthContext';
import {useLanguage} from '../../contexts/LanguageContext';
import CategoryIcon from '../../components/common/CategoryIcon';
import AiConsentModal from '../../components/common/AiConsentModal';
import Icon from '../../components/common/Icon';
import {useAiConsentGate} from '../../hooks/useAiConsentGate';
import {hasAiConsent} from '../../lib/aiConsent';
import api, {getApiErrorMessage} from '../../lib/api';
import {Category} from '../../types';

const CAMERA_PERMISSION = Platform.select({
  ios: PERMISSIONS.IOS.CAMERA,
  android: PERMISSIONS.ANDROID.CAMERA,
})!;

type Step = 'pick' | 'review' | 'done';

interface ScannedDraft {
  vendor: string;
  amount: string;
  currency: string;
  date: string;
  categoryId: string;
  receiptImageKey?: string;
}

export default function ScanScreen() {
  const {t} = useTranslation();
  const {language} = useLanguage();
  const {user} = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [step, setStep] = useState<Step>('pick');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [draft, setDraft] = useState<ScannedDraft | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [cameraBlocked, setCameraBlocked] = useState(false);
  const {
    aiConsentVisible,
    runWithAiConsent,
    onAllowAiConsent,
    onDenyAiConsent,
  } = useAiConsentGate();

  const refreshCameraPermission = useCallback(async () => {
    try {
      const status = await check(CAMERA_PERMISSION);
      if (status === RESULTS.GRANTED || status === RESULTS.LIMITED) {
        setCameraBlocked(false);
      }
    } catch {
      // Keep current UI state if the check fails.
    }
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        refreshCameraPermission();
      }
    });
    return () => sub.remove();
  }, [refreshCameraPermission]);

  async function ensureCameraPermission(): Promise<boolean> {
    let status = await check(CAMERA_PERMISSION);
    if (status === RESULTS.GRANTED || status === RESULTS.LIMITED) {
      setCameraBlocked(false);
      return true;
    }
    if (status === RESULTS.DENIED) {
      status = await request(CAMERA_PERMISSION);
      if (status === RESULTS.GRANTED || status === RESULTS.LIMITED) {
        setCameraBlocked(false);
        return true;
      }
    }
    setCameraBlocked(true);
    return false;
  }

  async function pickAndScan(fromCamera: boolean) {
    if (fromCamera) {
      const ok = await ensureCameraPermission();
      if (!ok) {return;}
    }
    const result = fromCamera
      ? await launchCamera({mediaType: 'photo', quality: 0.8, saveToPhotos: false})
      : await launchImageLibrary({mediaType: 'photo', quality: 0.8});

    if (fromCamera && result.didCancel !== true && !result.assets?.[0]) {
      // Camera often fails silently after a prior "Don't Allow".
      const status = await check(CAMERA_PERMISSION);
      if (status !== RESULTS.GRANTED && status !== RESULTS.LIMITED) {
        setCameraBlocked(true);
        return;
      }
    }

    if (!result.assets?.[0]) {return;}
    if (!(await hasAiConsent())) {
      Alert.alert(t('aiConsent.requiredTitle'), t('aiConsent.requiredMessage'));
      return;
    }
    const asset = result.assets[0];
    setImageUri(asset.uri ?? null);
    setScanning(true);

    try {
      const formData = new FormData();
      formData.append('receipt', {
        uri: asset.uri,
        name: asset.fileName || 'receipt.jpg',
        type: asset.type || 'image/jpeg',
      } as any);

      const {data} = await api.post('/expenses/scan', formData, {
        headers: {'Content-Type': 'multipart/form-data'},
      });

      const cats = await getCategoriesApi();
      setCategories(cats);
      setDraft({
        vendor: data.vendor ?? '',
        amount: String(data.amount ?? ''),
        currency: data.currency ?? user?.homeCurrency ?? 'USD',
        date: data.date ?? new Date().toISOString().slice(0, 10),
        categoryId: data.suggestedCategoryId ?? '',
        receiptImageKey: data.receiptImageKey,
      });
      setStep('review');
    } catch (err) {
      Alert.alert(t('scan.scanFailedTitle'), getApiErrorMessage(err, t('scan.errorScan')));
    } finally {
      setScanning(false);
    }
  }

  async function handleSave() {
    if (!draft) {return;}
    if (!draft.vendor.trim() || !draft.amount || !draft.currency) {
      Alert.alert(t('common.error'), t('scan.errorRequiredFields'));
      return;
    }
    setSaving(true);
    try {
      await createExpenseApi({
        vendor: draft.vendor.trim(),
        amount: parseFloat(draft.amount),
        currency: draft.currency.toUpperCase(),
        date: draft.date,
        categoryId: draft.categoryId || null,
        receiptImageKey: draft.receiptImageKey,
      });
      setStep('done');
    } catch (err) {
      Alert.alert(t('common.error'), getApiErrorMessage(err, t('scan.errorSave')));
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setStep('pick');
    setImageUri(null);
    setDraft(null);
  }

  if (step === 'done') {
    return (
      <View style={[styles.screen, styles.doneScreen, {paddingTop: insets.top + 24}]}>
        <View style={styles.doneOrb} pointerEvents="none" />
        <View style={styles.doneBadge}>
          <Icon name="check" size={28} color="#fff" />
        </View>
        <Text style={styles.doneTitle}>{t('scan.savedTitle')}</Text>
        <Text style={styles.doneBody}>{t('scan.savedBody')}</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={reset} activeOpacity={0.85}>
          <Icon name="camera" size={18} color="#fff" />
          <Text style={styles.primaryBtnText}>{t('scan.scanAnother')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.ghostBtn}
          onPress={() => navigation.navigate('Dashboard')}
          activeOpacity={0.85}
        >
          <Text style={styles.ghostBtnText}>{t('scan.goToHomepage')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (step === 'review' && draft) {
    return (
      <View style={[styles.screen, {paddingTop: insets.top}]}>
        <View style={styles.reviewHeader}>
          <TouchableOpacity onPress={reset} hitSlop={10} style={styles.backChip}>
            <Icon name="arrow-left" size={18} color="#3e6378" />
          </TouchableOpacity>
          <View style={{flex: 1}}>
            <Text style={styles.eyebrow}>{t('scan.eyebrow')}</Text>
            <Text style={styles.reviewTitle}>{t('scan.reviewTitle')}</Text>
            <Text style={styles.reviewHint}>{t('scan.reviewHint')}</Text>
          </View>
        </View>

        <ScrollView
          style={{flex: 1}}
          contentContainerStyle={styles.reviewContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {imageUri ? (
            <View style={styles.previewCard}>
              <Image source={{uri: imageUri}} style={styles.preview} resizeMode="cover" />
              <View style={styles.previewMeta}>
                <Icon name="file-text" size={14} color="#81a8c0" />
                <Text style={styles.previewMetaText}>{t('scan.eyebrow')}</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.formCard}>
            <Text style={styles.label}>{t('expenses.vendorLabel')}</Text>
            <TextInput
              style={styles.input}
              value={draft.vendor}
              onChangeText={v => setDraft(d => (d ? {...d, vendor: v} : d))}
              placeholder={t('expenses.vendorPlaceholder')}
              placeholderTextColor="#9CA3AF"
            />

            <View style={styles.row}>
              <View style={{flex: 2}}>
                <Text style={styles.label}>{t('expenses.amountLabel')}</Text>
                <TextInput
                  style={styles.input}
                  value={draft.amount}
                  onChangeText={v => setDraft(d => (d ? {...d, amount: v} : d))}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={{flex: 1}}>
                <Text style={styles.label}>{t('expenses.currencyLabel')}</Text>
                <TextInput
                  style={styles.input}
                  value={draft.currency}
                  onChangeText={v =>
                    setDraft(d => (d ? {...d, currency: v.toUpperCase()} : d))
                  }
                  autoCapitalize="characters"
                  maxLength={3}
                />
              </View>
            </View>

            <Text style={styles.label}>{t('expenses.dateLabel')}</Text>
            <TouchableOpacity style={styles.dateField} onPress={() => setShowDatePicker(true)}>
              <Icon name="calendar" size={16} color="#3e6378" />
              <Text style={styles.dateText}>
                {new Date(draft.date + 'T00:00:00').toLocaleDateString(language, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={new Date(draft.date + 'T00:00:00')}
                mode="date"
                display="default"
                maximumDate={new Date()}
                onChange={(_e, selected) => {
                  setShowDatePicker(false);
                  if (selected) {
                    setDraft(d =>
                      d ? {...d, date: selected.toISOString().slice(0, 10)} : d,
                    );
                  }
                }}
              />
            )}

            <Text style={styles.label}>{t('expenses.categoryLabel')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 8}}>
              <View style={styles.chipRow}>
                <TouchableOpacity
                  style={[styles.catChip, !draft.categoryId && styles.catChipActive]}
                  onPress={() => setDraft(d => (d ? {...d, categoryId: ''} : d))}
                >
                  <Text
                    style={[
                      styles.catChipText,
                      !draft.categoryId && styles.catChipTextActive,
                    ]}
                  >
                    {t('common.none')}
                  </Text>
                </TouchableOpacity>
                {categories.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.catChip,
                      draft.categoryId === c.id && styles.catChipActive,
                    ]}
                    onPress={() =>
                      setDraft(d => (d ? {...d, categoryId: c.id} : d))
                    }
                  >
                    <CategoryIcon
                      icon={c.icon}
                      color={draft.categoryId === c.id ? '#3e6378' : '#6B7280'}
                      size={14}
                      withBadge={false}
                    />
                    <Text
                      style={[
                        styles.catChipText,
                        draft.categoryId === c.id && styles.catChipTextActive,
                      ]}
                    >
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </ScrollView>

        <View style={[styles.footer, {paddingBottom: Math.max(insets.bottom, 16)}]}>
          <TouchableOpacity
            style={[styles.primaryBtn, saving && {opacity: 0.6}]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Icon name="check" size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>{t('scan.saveExpense')}</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={reset} style={styles.cancelWrap}>
            <Text style={styles.cancelText}>{t('scan.cancel')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Pick / scanning
  return (
    <View style={[styles.screen, {paddingTop: insets.top + 12}]}>
      <AiConsentModal
        visible={aiConsentVisible}
        onAllow={onAllowAiConsent}
        onDeny={onDenyAiConsent}
      />
      <ScrollView
        contentContainerStyle={[
          styles.pickContent,
          {paddingBottom: Math.max(insets.bottom, 24)},
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>{t('scan.eyebrow')}</Text>
        <Text style={styles.heroTitle}>{t('scan.title')}</Text>
        <Text style={styles.heroSub}>{t('scan.subtitle')}</Text>

        <View style={styles.stage}>
          <View style={styles.stageWash} pointerEvents="none" />
          <View style={styles.stageOrb} pointerEvents="none" />

          {scanning ? (
            <View style={styles.stageInner}>
              {imageUri ? (
                <Image source={{uri: imageUri}} style={styles.stagePreview} resizeMode="cover" />
              ) : (
                <View style={styles.framePlaceholder}>
                  <Icon name="file-text" size={36} color="rgba(255,255,255,0.45)" />
                </View>
              )}
              <View style={styles.scanOverlay}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.scanOverlayTitle}>{t('scan.scanningReceipt')}</Text>
                <Text style={styles.scanOverlayHint}>{t('scan.scanningHint')}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.stageInner}>
              <View style={styles.receiptFrame}>
                <View style={styles.frameCornerTL} />
                <View style={styles.frameCornerTR} />
                <View style={styles.frameCornerBL} />
                <View style={styles.frameCornerBR} />
                <Icon name="camera" size={40} color="rgba(255,255,255,0.9)" />
                <Text style={styles.frameCaption}>{t('scan.tip')}</Text>
              </View>
            </View>
          )}
        </View>

        {!scanning && cameraBlocked && (
          <View style={styles.permissionCard}>
            <View style={styles.permissionIconWrap}>
              <Icon name="camera-off" size={22} color="#3e6378" />
            </View>
            <Text style={styles.permissionTitle}>{t('scan.cameraNeededTitle')}</Text>
            <Text style={styles.permissionMessage}>{t('scan.cameraNeededMessage')}</Text>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => openSettings()}
              activeOpacity={0.85}
            >
              <Icon name="settings" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>{t('scan.openSettings')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ghostBtn}
              onPress={() => runWithAiConsent(() => { pickAndScan(true); })}
              activeOpacity={0.85}
            >
              <Text style={styles.ghostBtnText}>{t('scan.tryCameraAgain')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {!scanning && (
          <View style={styles.actionStack}>
            {!cameraBlocked && (
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => runWithAiConsent(() => { pickAndScan(true); })}
                activeOpacity={0.85}
              >
                <Icon name="camera" size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>{t('scan.useCamera')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => runWithAiConsent(() => { pickAndScan(false); })}
              activeOpacity={0.85}
            >
              <Icon name="image" size={18} color="#1A2F3A" />
              <Text style={styles.secondaryBtnText}>{t('scan.chooseFromGallery')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: '#F4F7F9'},

  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: '#C4A574',
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A2F3A',
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  heroSub: {
    fontSize: 15,
    lineHeight: 22,
    color: '#5B6B75',
    marginBottom: 24,
  },

  pickContent: {paddingHorizontal: 20, paddingTop: 8},

  stage: {
    backgroundColor: '#1A2F3A',
    borderRadius: 24,
    minHeight: 280,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(129, 168, 192, 0.22)',
    marginBottom: 20,
  },
  stageWash: {
    position: 'absolute',
    top: -50,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(63, 168, 157, 0.16)',
  },
  stageOrb: {
    position: 'absolute',
    bottom: -60,
    left: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(62, 99, 120, 0.5)',
  },
  stageInner: {
    flex: 1,
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  receiptFrame: {
    width: '100%',
    maxWidth: 260,
    aspectRatio: 0.72,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  frameCornerTL: {
    position: 'absolute', top: 10, left: 10,
    width: 18, height: 18,
    borderTopWidth: 2.5, borderLeftWidth: 2.5,
    borderColor: '#C4A574', borderTopLeftRadius: 4,
  },
  frameCornerTR: {
    position: 'absolute', top: 10, right: 10,
    width: 18, height: 18,
    borderTopWidth: 2.5, borderRightWidth: 2.5,
    borderColor: '#C4A574', borderTopRightRadius: 4,
  },
  frameCornerBL: {
    position: 'absolute', bottom: 10, left: 10,
    width: 18, height: 18,
    borderBottomWidth: 2.5, borderLeftWidth: 2.5,
    borderColor: '#C4A574', borderBottomLeftRadius: 4,
  },
  frameCornerBR: {
    position: 'absolute', bottom: 10, right: 10,
    width: 18, height: 18,
    borderBottomWidth: 2.5, borderRightWidth: 2.5,
    borderColor: '#C4A574', borderBottomRightRadius: 4,
  },
  frameCaption: {
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(171, 197, 213, 0.95)',
    textAlign: 'center',
  },
  framePlaceholder: {
    width: '100%',
    maxWidth: 220,
    aspectRatio: 0.72,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stagePreview: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.35,
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 10,
    backgroundColor: 'rgba(26, 47, 58, 0.55)',
  },
  scanOverlayTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
  },
  scanOverlayHint: {
    color: 'rgba(171, 197, 213, 0.95)',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },

  permissionCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8EEF2',
    padding: 18,
    marginBottom: 14,
    alignItems: 'center',
    gap: 8,
  },
  permissionIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#EEF4F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  permissionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A2F3A',
    textAlign: 'center',
  },
  permissionMessage: {
    fontSize: 14,
    lineHeight: 20,
    color: '#5B6B75',
    textAlign: 'center',
    marginBottom: 8,
  },

  actionStack: {gap: 10},
  primaryBtn: {
    backgroundColor: '#3e6378',
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: {color: '#fff', fontWeight: '700', fontSize: 15},
  secondaryBtn: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#D7E2E9',
  },
  secondaryBtnText: {color: '#1A2F3A', fontWeight: '700', fontSize: 15},
  ghostBtn: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  ghostBtnText: {color: '#3e6378', fontWeight: '600', fontSize: 15},

  // Review
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backChip: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  reviewTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A2F3A',
    letterSpacing: -0.3,
  },
  reviewHint: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  reviewContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 14,
  },
  previewCard: {
    backgroundColor: '#1A2F3A',
    borderRadius: 18,
    overflow: 'hidden',
  },
  preview: {width: '100%', height: 168},
  previewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  previewMetaText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#81a8c0',
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8EEF2',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5B6B75',
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    marginBottom: 14,
  },
  row: {flexDirection: 'row', gap: 12},
  dateField: {
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateText: {fontSize: 15, color: '#111827', fontWeight: '500'},
  chipRow: {flexDirection: 'row', gap: 8, paddingVertical: 2},
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  catChipActive: {backgroundColor: '#eef2f5', borderColor: '#3e6378'},
  catChipText: {fontSize: 13, color: '#374151'},
  catChipTextActive: {color: '#3e6378', fontWeight: '600'},
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    backgroundColor: '#F4F7F9',
    borderTopWidth: 1,
    borderTopColor: '#E8EEF2',
  },
  cancelWrap: {alignItems: 'center', marginTop: 10},
  cancelText: {color: '#9CA3AF', fontSize: 14, fontWeight: '500'},

  // Done
  doneScreen: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  doneOrb: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(63, 168, 157, 0.12)',
  },
  doneBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#3fa89d',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  doneTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A2F3A',
    marginBottom: 8,
    textAlign: 'center',
  },
  doneBody: {
    fontSize: 15,
    lineHeight: 22,
    color: '#5B6B75',
    textAlign: 'center',
    marginBottom: 28,
    maxWidth: 280,
  },
});
