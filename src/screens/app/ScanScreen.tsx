import React, {useState} from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, Image, ScrollView, TextInput, ActivityIndicator,
  Platform, PermissionsAndroid,
} from 'react-native';
import {launchImageLibrary, launchCamera} from 'react-native-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {getCategoriesApi} from '../../lib/services/categories.service';
import {createExpenseApi} from '../../lib/services/expenses.service';
import {useAuth} from '../../contexts/AuthContext';
import {useLanguage} from '../../contexts/LanguageContext';
import api from '../../lib/api';
import {Category} from '../../types';

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

  async function requestCameraPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {return true;}
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {title: t('scan.cameraPermissionTitle'), message: t('scan.cameraPermissionMessage'), buttonPositive: t('scan.cameraPermissionAllow')},
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }

  async function pickAndScan(fromCamera: boolean) {
    if (fromCamera) {
      const ok = await requestCameraPermission();
      if (!ok) {Alert.alert(t('scan.cameraPermissionDeniedTitle'), t('scan.cameraPermissionDeniedMessage')); return;}
    }
    const result = fromCamera
      ? await launchCamera({mediaType: 'photo', quality: 0.8})
      : await launchImageLibrary({mediaType: 'photo', quality: 0.8});

    if (!result.assets?.[0]) {return;}
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
    } catch (err: any) {
      const msg = err?.response?.data?.message || t('scan.errorScan');
      Alert.alert(t('scan.scanFailedTitle'), Array.isArray(msg) ? msg.join('\n') : msg);
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
    } catch (err: any) {
      const msg = err?.response?.data?.message || t('scan.errorSave');
      Alert.alert(t('common.error'), Array.isArray(msg) ? msg.join('\n') : msg);
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
      <View style={[styles.center, {paddingTop: insets.top + 16}]}>
        <Text style={styles.doneIcon}>✅</Text>
        <Text style={styles.doneTitle}>{t('scan.savedTitle')}</Text>
        <TouchableOpacity style={[styles.button, {width: 200, paddingVertical: 14, marginTop: 8}]} onPress={reset}>
          <Text style={styles.buttonText}>{t('scan.scanAnother')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.outlineButton, {width: 200, marginTop: 12}]} onPress={() => navigation.navigate('Dashboard')}>
          <Text style={styles.outlineButtonText}>{t('scan.goToHomepage')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (step === 'review' && draft) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={[styles.content, {paddingTop: insets.top + 16}]} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{t('scan.reviewTitle')}</Text>
        {imageUri && <Image source={{uri: imageUri}} style={styles.preview} resizeMode="cover" />}

        <Text style={styles.label}>{t('expenses.vendorLabel')}</Text>
        <TextInput style={styles.input} value={draft.vendor} onChangeText={v => setDraft(d => d ? {...d, vendor: v} : d)} placeholder={t('expenses.vendorPlaceholder')} placeholderTextColor="#9CA3AF" />

        <View style={{flexDirection: 'row', gap: 12}}>
          <View style={{flex: 2}}>
            <Text style={styles.label}>{t('expenses.amountLabel')}</Text>
            <TextInput style={styles.input} value={draft.amount} onChangeText={v => setDraft(d => d ? {...d, amount: v} : d)} keyboardType="decimal-pad" />
          </View>
          <View style={{flex: 1}}>
            <Text style={styles.label}>{t('expenses.currencyLabel')}</Text>
            <TextInput style={styles.input} value={draft.currency} onChangeText={v => setDraft(d => d ? {...d, currency: v.toUpperCase()} : d)} autoCapitalize="characters" maxLength={3} />
          </View>
        </View>

        <Text style={styles.label}>{t('expenses.dateLabel')}</Text>
        <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
          <Text style={{fontSize: 15, color: '#111827'}}>
            {new Date(draft.date + 'T00:00:00').toLocaleDateString(language, {year: 'numeric', month: 'long', day: 'numeric'})}
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
              if (selected) {setDraft(d => d ? {...d, date: selected.toISOString().slice(0, 10)} : d);}
            }}
          />
        )}

        <Text style={styles.label}>{t('expenses.categoryLabel')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 16}}>
          <View style={{flexDirection: 'row', gap: 8}}>
            <TouchableOpacity
              style={[styles.catChip, !draft.categoryId && styles.catChipActive]}
              onPress={() => setDraft(d => d ? {...d, categoryId: ''} : d)}>
              <Text style={[styles.catChipText, !draft.categoryId && styles.catChipTextActive]}>{t('common.none')}</Text>
            </TouchableOpacity>
            {categories.map(c => (
              <TouchableOpacity
                key={c.id}
                style={[styles.catChip, draft.categoryId === c.id && styles.catChipActive]}
                onPress={() => setDraft(d => d ? {...d, categoryId: c.id} : d)}>
                <Text style={[styles.catChipText, draft.categoryId === c.id && styles.catChipTextActive]}>
                  {c.icon} {c.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <TouchableOpacity style={[styles.button, saving && {opacity: 0.6}]} onPress={handleSave} disabled={saving}>
          <Text style={styles.buttonText}>{saving ? t('scan.saving') : t('scan.saveExpense')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={reset} style={{alignItems: 'center', marginTop: 12}}>
          <Text style={styles.cancelText}>{t('scan.cancel')}</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <View style={[styles.center, {paddingTop: insets.top + 16}]}>
      <Text style={styles.title}>{t('scan.title')}</Text>
      <Text style={styles.sub}>{t('scan.subtitle')}</Text>

      {scanning ? (
        <>
          <ActivityIndicator size="large" color="#3e6378" style={{marginTop: 32}} />
          <Text style={styles.scanningText}>{t('scan.scanningReceipt')}</Text>
        </>
      ) : (
        <View style={{gap: 12, width: '100%', marginTop: 32}}>
          <TouchableOpacity style={styles.button} onPress={() => pickAndScan(true)}>
            <Text style={styles.buttonText}>{t('scan.useCamera')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.buttonOutline} onPress={() => pickAndScan(false)}>
            <Text style={styles.buttonOutlineText}>{t('scan.chooseFromGallery')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F9FAFB'},
  content: {padding: 16, gap: 4, paddingBottom: 40},
  center: {flex: 1, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center', padding: 24},
  title: {fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 8, textAlign: 'center'},
  sub: {fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20},
  preview: {width: '100%', height: 180, borderRadius: 12, marginBottom: 16},
  label: {fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 4},
  input: {backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: '#111827', marginBottom: 12},
  catChip: {paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB'},
  catChipActive: {backgroundColor: '#eef2f5', borderColor: '#3e6378'},
  catChipText: {fontSize: 13, color: '#374151'},
  catChipTextActive: {color: '#3e6378', fontWeight: '600'},
  button: {backgroundColor: '#3e6378', borderRadius: 12, paddingVertical: 14, alignItems: 'center'},
  buttonText: {color: '#fff', fontWeight: '600', fontSize: 15},
  outlineButton: {borderWidth: 1.5, borderColor: '#3e6378', borderRadius: 12, paddingVertical: 13, alignItems: 'center'},
  outlineButtonText: {color: '#3e6378', fontWeight: '600', fontSize: 15},
  buttonOutline: {borderWidth: 1.5, borderColor: '#3e6378', borderRadius: 12, paddingVertical: 14, alignItems: 'center'},
  buttonOutlineText: {color: '#3e6378', fontWeight: '600', fontSize: 15},
  cancelText: {color: '#9CA3AF', fontSize: 14},
  scanningText: {fontSize: 14, color: '#6B7280', marginTop: 12},
  doneIcon: {fontSize: 48, marginBottom: 12},
  doneTitle: {fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 24},
});
