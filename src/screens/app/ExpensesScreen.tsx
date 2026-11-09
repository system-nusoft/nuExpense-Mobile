import React, {useEffect, useState, useCallback, useRef} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Modal, TextInput, ScrollView, Linking,
  Image, Platform, PermissionsAndroid,
} from 'react-native';
import {launchImageLibrary, launchCamera} from 'react-native-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import {useAuth} from '../../contexts/AuthContext';
import {useLanguage} from '../../contexts/LanguageContext';
import {getExpensesApi, createExpenseApi, updateExpenseApi, deleteExpenseApi} from '../../lib/services/expenses.service';
import {getCategoriesApi} from '../../lib/services/categories.service';
import api from '../../lib/api';
import {Expense, Category} from '../../types';

function fmt(amount: string | number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {style: 'currency', currency, minimumFractionDigits: 2}).format(Number(amount));
}

function formatDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale, {month: 'short', day: 'numeric', year: 'numeric'});
}

const EMPTY_FORM = {
  vendor: '', amount: '', currency: '',
  date: new Date().toISOString().slice(0, 10),
  categoryId: '', notes: '',
};

export default function ExpensesScreen() {
  const {t} = useTranslation();
  const {language} = useLanguage();
  const {user} = useAuth();
  const insets = useSafeAreaInsets();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scannedImageUri, setScannedImageUri] = useState<string | null>(null);
  const [scannedReceiptKey, setScannedReceiptKey] = useState<string | null>(null);

  const defaultCurrency = user?.homeCurrency || 'USD';

  const loadExpenses = useCallback(async (p: number) => {
    try {
      const res = await getExpensesApi(p, 20);
      if (p === 1) {setExpenses(res.data);}
      else {setExpenses(prev => [...prev, ...res.data]);}
      setTotal(res.total);
    } catch {}
    finally {setLoading(false);}
  }, []);

  const initialLoad = useRef(false);

  useEffect(() => {
    getCategoriesApi().then(setCategories).catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      setPage(1);
      setLoading(true);
      loadExpenses(1);
    }, [loadExpenses]),
  );

  function openAdd() {
    setEditingExpense(null);
    setForm({...EMPTY_FORM, currency: defaultCurrency});
    setScannedImageUri(null);
    setScannedReceiptKey(null);
    setModalVisible(true);
  }

  function openEdit(e: Expense) {
    setEditingExpense(e);
    setForm({
      vendor: e.vendor,
      amount: e.amount,
      currency: e.currency,
      date: e.date.slice(0, 10),
      categoryId: e.categoryId ?? '',
      notes: e.notes ?? '',
    });
    setScannedImageUri(null);
    setScannedReceiptKey(null);
    setModalVisible(true);
  }

  async function requestCameraPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {return true;}
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {title: t('expenses.cameraPermissionTitle'), message: t('expenses.cameraPermissionMessage'), buttonPositive: t('expenses.cameraPermissionAllow')},
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }

  async function pickAndScan(fromCamera: boolean) {
    if (fromCamera) {
      const ok = await requestCameraPermission();
      if (!ok) {Alert.alert(t('expenses.cameraPermissionDeniedTitle'), t('expenses.cameraPermissionDeniedMessage')); return;}
    }
    const result = fromCamera
      ? await launchCamera({mediaType: 'photo', quality: 0.8})
      : await launchImageLibrary({mediaType: 'photo', quality: 0.8});

    if (!result.assets?.[0]) {return;}
    const asset = result.assets[0];
    setScannedImageUri(asset.uri ?? null);
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

      setForm(f => ({
        ...f,
        vendor: data.vendor ?? f.vendor,
        amount: data.amount != null ? String(data.amount) : f.amount,
        currency: data.currency ?? f.currency,
        date: data.date ?? f.date,
        categoryId: data.suggestedCategoryId ?? f.categoryId,
      }));
      setScannedReceiptKey(data.receiptImageKey ?? null);
    } catch (err: any) {
      const msg = err?.response?.data?.message || t('expenses.errorScan');
      Alert.alert(t('expenses.scanFailedTitle'), Array.isArray(msg) ? msg.join('\n') : msg);
      setScannedImageUri(null);
    } finally {
      setScanning(false);
    }
  }

  async function handleSave() {
    if (!form.vendor.trim() || !form.amount || !form.currency) {
      Alert.alert(t('common.error'), t('expenses.errorRequiredFields'));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        vendor: form.vendor.trim(),
        amount: parseFloat(form.amount),
        currency: form.currency.toUpperCase(),
        date: form.date,
        categoryId: form.categoryId || null,
        notes: form.notes.trim() || null,
      };
      if (editingExpense) {
        await updateExpenseApi(editingExpense.id, payload);
      } else {
        await createExpenseApi(scannedReceiptKey ? {...payload, receiptImageKey: scannedReceiptKey} : payload);
      }
      setModalVisible(false);
      setPage(1);
      setLoading(true);
      loadExpenses(1);
    } catch (err: any) {
      const msg = err?.response?.data?.message || t('expenses.errorSave');
      Alert.alert(t('common.error'), Array.isArray(msg) ? msg.join('\n') : msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    Alert.alert(t('expenses.deleteConfirmTitle'), t('expenses.deleteConfirmMessage'), [
      {text: t('common.cancel'), style: 'cancel'},
      {
        text: t('common.delete'), style: 'destructive',
        onPress: async () => {
          try {
            await deleteExpenseApi(id);
            setExpenses(prev => prev.filter(e => e.id !== id));
            setTotal(prev => prev - 1);
            setModalVisible(false);
          } catch {
            Alert.alert(t('common.error'), t('expenses.errorDelete'));
          }
        },
      },
    ]);
  }

  function loadMore() {
    if (expenses.length < total) {
      const next = page + 1;
      setPage(next);
      loadExpenses(next);
    }
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, {paddingTop: insets.top + 12}]}>
        <Text style={styles.title}>{t('expenses.title')}</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Text style={styles.addBtnText}>{t('expenses.addBtn')}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color="#3e6378" style={{marginTop: 40}} />
      ) : expenses.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{t('expenses.emptyText')}</Text>
          <TouchableOpacity onPress={openAdd}>
            <Text style={styles.emptyLink}>{t('expenses.emptyLink')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={e => e.id}
          contentContainerStyle={{padding: 16, gap: 10, paddingBottom: 32}}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          renderItem={({item}) => (
            <TouchableOpacity style={styles.card} onPress={() => openEdit(item)}>
              <View style={styles.cardLeft}>
                <Text style={styles.cardIcon}>{item.category?.icon ?? '💸'}</Text>
                <View style={{flex: 1}}>
                  <Text style={styles.cardVendor} numberOfLines={1}>{item.vendor}</Text>
                  <Text style={styles.cardMeta}>
                    {formatDate(item.date, language)} · {item.category?.name ?? t('expenses.uncategorized')}
                  </Text>
                  {item.homeCurrencyCode && item.homeCurrencyCode !== item.currency && (
                    <Text style={styles.converted}>≈ {fmt(item.homeCurrencyAmount!, item.homeCurrencyCode, language)}</Text>
                  )}
                </View>
              </View>
              <Text style={styles.cardAmount}>{fmt(item.amount, item.currency, language)}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={[styles.modalHeader, {paddingTop: insets.top + 12}]}>
            <Text style={styles.modalTitle}>{editingExpense ? t('expenses.editTitle') : t('expenses.addTitle')}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">

            {/* View Receipt button */}
            {editingExpense?.receiptImageUrl && (
              <TouchableOpacity
                style={styles.receiptBtn}
                onPress={() => Linking.openURL(editingExpense.receiptImageUrl!)}>
                <Text style={styles.receiptBtnText}>{t('expenses.viewReceipt')}</Text>
              </TouchableOpacity>
            )}

            {/* Scan receipt (only when adding a new expense) */}
            {!editingExpense && (
              <>
                {scannedImageUri && (
                  <Image source={{uri: scannedImageUri}} style={styles.scanPreview} resizeMode="cover" />
                )}
                {scanning ? (
                  <View style={styles.scanningRow}>
                    <ActivityIndicator color="#3e6378" />
                    <Text style={styles.scanningText}>{t('expenses.scanningReceipt')}</Text>
                  </View>
                ) : (
                  <View style={styles.scanRow}>
                    <TouchableOpacity style={styles.scanBtn} onPress={() => pickAndScan(true)}>
                      <Text style={styles.scanBtnText}>{t('expenses.scanWithCamera')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.scanBtnOutline} onPress={() => pickAndScan(false)}>
                      <Text style={styles.scanBtnOutlineText}>{t('expenses.fromGallery')}</Text>
                    </TouchableOpacity>
                  </View>
                )}
                <View style={styles.orDivider}>
                  <View style={styles.orLine} />
                  <Text style={styles.orText}>{t('expenses.orEnterManually')}</Text>
                  <View style={styles.orLine} />
                </View>
              </>
            )}

            <Text style={styles.label}>{t('expenses.vendorLabel')}</Text>
            <TextInput
              style={styles.input}
              value={form.vendor}
              onChangeText={v => setForm(f => ({...f, vendor: v}))}
              placeholder={t('expenses.vendorPlaceholder')}
              placeholderTextColor="#9CA3AF"
            />

            <View style={{flexDirection: 'row', gap: 12}}>
              <View style={{flex: 2}}>
                <Text style={styles.label}>{t('expenses.amountLabel')}</Text>
                <TextInput
                  style={styles.input}
                  value={form.amount}
                  onChangeText={v => setForm(f => ({...f, amount: v}))}
                  placeholder="0.00"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={{flex: 1}}>
                <Text style={styles.label}>{t('expenses.currencyLabel')}</Text>
                <TextInput
                  style={styles.input}
                  value={form.currency}
                  onChangeText={v => setForm(f => ({...f, currency: v.toUpperCase()}))}
                  placeholder="USD"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="characters"
                  maxLength={3}
                />
              </View>
            </View>

            <Text style={styles.label}>{t('expenses.dateLabel')}</Text>
            <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
              <Text style={{fontSize: 15, color: '#111827'}}>
                {new Date(form.date + 'T00:00:00').toLocaleDateString(language, {year: 'numeric', month: 'long', day: 'numeric'})}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={new Date(form.date + 'T00:00:00')}
                mode="date"
                display="default"
                maximumDate={new Date()}
                onChange={(_e, selected) => {
                  setShowDatePicker(false);
                  if (selected) {setForm(f => ({...f, date: selected.toISOString().slice(0, 10)}));}
                }}
              />
            )}

            <Text style={styles.label}>{t('expenses.notesLabel')}</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              value={form.notes}
              onChangeText={v => setForm(f => ({...f, notes: v}))}
              placeholder={t('expenses.notesPlaceholder')}
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
            />

            <Text style={styles.label}>{t('expenses.categoryLabel')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 16}}>
              <View style={{flexDirection: 'row', gap: 8}}>
                <TouchableOpacity
                  style={[styles.catChip, !form.categoryId && styles.catChipActive]}
                  onPress={() => setForm(f => ({...f, categoryId: ''}))}>
                  <Text style={[styles.catChipText, !form.categoryId && styles.catChipTextActive]}>{t('common.none')}</Text>
                </TouchableOpacity>
                {categories.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.catChip, form.categoryId === c.id && styles.catChipActive]}
                    onPress={() => setForm(f => ({...f, categoryId: c.id}))}>
                    <Text style={[styles.catChipText, form.categoryId === c.id && styles.catChipTextActive]}>
                      {c.icon} {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.saveBtn, saving && {opacity: 0.6}]}
              onPress={handleSave}
              disabled={saving}>
              <Text style={styles.saveBtnText}>{saving ? t('common.saving') : editingExpense ? t('expenses.saveChanges') : t('expenses.addExpense')}</Text>
            </TouchableOpacity>

            {editingExpense && (
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDelete(editingExpense.id)}>
                <Text style={styles.deleteBtnText}>{t('expenses.deleteExpense')}</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F9FAFB'},
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  title: {fontSize: 20, fontWeight: '700', color: '#111827'},
  addBtn: {backgroundColor: '#3e6378', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10},
  addBtnText: {color: '#fff', fontWeight: '600', fontSize: 14},
  empty: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8},
  emptyText: {fontSize: 15, color: '#6B7280'},
  emptyLink: {fontSize: 14, color: '#3e6378', fontWeight: '600'},
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  cardLeft: {flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1},
  cardIcon: {fontSize: 24},
  cardVendor: {fontSize: 14, fontWeight: '600', color: '#111827', maxWidth: 200},
  cardMeta: {fontSize: 12, color: '#9CA3AF', marginTop: 2},
  converted: {fontSize: 11, color: '#9CA3AF', marginTop: 1},
  cardAmount: {fontSize: 15, fontWeight: '700', color: '#111827'},
  modal: {flex: 1, backgroundColor: '#fff'},
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  modalTitle: {fontSize: 18, fontWeight: '700', color: '#111827'},
  modalClose: {fontSize: 18, color: '#6B7280', padding: 4},
  modalBody: {padding: 16, gap: 4, paddingBottom: 40},
  receiptBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#86EFAC',
    borderRadius: 10, paddingVertical: 10, marginBottom: 16,
  },
  receiptBtnText: {color: '#16A34A', fontWeight: '600', fontSize: 14},
  scanPreview: {width: '100%', height: 140, borderRadius: 12, marginBottom: 12},
  scanRow: {flexDirection: 'row', gap: 10, marginBottom: 16},
  scanBtn: {flex: 1, backgroundColor: '#3e6378', borderRadius: 12, paddingVertical: 13, alignItems: 'center'},
  scanBtnText: {color: '#fff', fontWeight: '600', fontSize: 13},
  scanBtnOutline: {flex: 1, borderWidth: 1.5, borderColor: '#3e6378', borderRadius: 12, paddingVertical: 13, alignItems: 'center'},
  scanBtnOutlineText: {color: '#3e6378', fontWeight: '600', fontSize: 13},
  scanningRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, marginBottom: 16},
  scanningText: {fontSize: 13, color: '#6B7280'},
  orDivider: {flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16},
  orLine: {flex: 1, height: 1, backgroundColor: '#E5E7EB'},
  orText: {fontSize: 11, fontWeight: '600', color: '#9CA3AF', letterSpacing: 0.5},
  label: {fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 4},
  input: {
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 15, color: '#111827', marginBottom: 12,
  },
  notesInput: {height: 80, textAlignVertical: 'top'},
  catChip: {paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB'},
  catChipActive: {backgroundColor: '#eef2f5', borderColor: '#3e6378'},
  catChipText: {fontSize: 13, color: '#374151'},
  catChipTextActive: {color: '#3e6378', fontWeight: '600'},
  saveBtn: {backgroundColor: '#3e6378', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8},
  saveBtnText: {color: '#fff', fontWeight: '600', fontSize: 15},
  deleteBtn: {
    borderWidth: 1, borderColor: '#FCA5A5', borderRadius: 12,
    paddingVertical: 12, alignItems: 'center', marginTop: 10,
  },
  deleteBtnText: {color: '#EF4444', fontWeight: '600', fontSize: 14},
});
