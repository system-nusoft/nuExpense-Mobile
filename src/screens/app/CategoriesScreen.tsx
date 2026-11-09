import React, {useEffect, useState} from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, Modal, TextInput, ScrollView, ActivityIndicator,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import {getCategoriesApi, createCategoryApi, updateCategoryApi, deleteCategoryApi} from '../../lib/services/categories.service';
import CategoryIcon from '../../components/common/CategoryIcon';
import Icon from '../../components/common/Icon';
import {getApiErrorMessage} from '../../lib/api';
import {
  CATEGORY_ICON_OPTIONS,
  DEFAULT_CATEGORY_ICON,
  resolveCategoryIcon,
} from '../../lib/categoryIcons';
import {Category} from '../../types';

const COLORS = ['#EF4444','#F97316','#EAB308','#22C55E','#14B8A6','#3B82F6','#8B5CF6','#EC4899','#6B7280'];
const EMPTY_FORM = {
  name: '',
  icon: DEFAULT_CATEGORY_ICON,
  color: COLORS[0],
  budgetAmount: '',
};

export default function CategoriesScreen() {
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const data = await getCategoriesApi();
      setCategories(data);
    } catch {}
    finally {setLoading(false);}
  }

  useEffect(() => {load();}, []);

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalVisible(true);
  }

  function openEdit(c: Category) {
    setEditingId(c.id);
    setForm({
      name: c.name,
      icon: resolveCategoryIcon(c.icon),
      color: c.color,
      budgetAmount: c.budgetAmount ? String(c.budgetAmount) : '',
    });
    setModalVisible(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.icon.trim()) {
      Alert.alert(t('common.error'), t('categories.errorRequired'));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        icon: form.icon.trim(),
        color: form.color,
        budgetAmount: form.budgetAmount ? parseFloat(form.budgetAmount) : null,
      };
      if (editingId) {
        await updateCategoryApi(editingId, payload);
      } else {
        await createCategoryApi(payload);
      }
      setModalVisible(false);
      load();
    } catch (err) {
      Alert.alert(t('common.error'), getApiErrorMessage(err, t('categories.errorSave')));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    Alert.alert(t('categories.deleteConfirmTitle'), t('categories.deleteConfirmMessage'), [
      {text: t('common.cancel'), style: 'cancel'},
      {
        text: t('common.delete'), style: 'destructive',
        onPress: async () => {
          try {
            await deleteCategoryApi(id);
            setCategories(prev => prev.filter(c => c.id !== id));
          } catch (err) {
            Alert.alert(t('common.error'), getApiErrorMessage(err, t('categories.errorDelete')));
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, {paddingTop: insets.top + 12}]}>
        <Text style={styles.title}>{t('categories.title')}</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Text style={styles.addBtnText}>{t('categories.addBtn')}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color="#3e6378" style={{marginTop: 40}} />
      ) : (
        <FlatList
          data={categories}
          keyExtractor={c => c.id}
          contentContainerStyle={{padding: 16, gap: 10, paddingBottom: 32}}
          renderItem={({item}) => (
            <TouchableOpacity style={styles.card} onPress={() => openEdit(item)} onLongPress={() => handleDelete(item.id)}>
              <CategoryIcon icon={item.icon} color={item.color} size={20} badgeSize={44} />
              <View style={{flex: 1}}>
                <Text style={styles.catName}>{item.name}</Text>
                {item.budgetAmount && (
                  <Text style={styles.budget}>{t('categories.budgetPerMonth', {amount: item.budgetAmount})}</Text>
                )}
              </View>
              <View style={[styles.dot, {backgroundColor: item.color}]} />
            </TouchableOpacity>
          )}
        />
      )}

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={[styles.modalHeader, {paddingTop: insets.top + 12}]}>
            <Text style={styles.modalTitle}>{editingId ? t('categories.editTitle') : t('categories.newTitle')}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={8}>
              <Icon name="x" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>{t('categories.nameLabel')}</Text>
            <TextInput style={styles.input} value={form.name} onChangeText={v => setForm(f => ({...f, name: v}))} placeholder={t('categories.namePlaceholder')} placeholderTextColor="#9CA3AF" />

            <Text style={styles.label}>{t('categories.iconLabel')}</Text>
            <View style={styles.iconGrid}>
              {CATEGORY_ICON_OPTIONS.map(name => {
                const selected = form.icon === name;
                return (
                  <TouchableOpacity
                    key={name}
                    onPress={() => setForm(f => ({...f, icon: name}))}
                    style={[
                      styles.iconOption,
                      selected && {borderColor: form.color, backgroundColor: form.color + '18'},
                    ]}
                  >
                    <Icon name={name} size={20} color={selected ? form.color : '#6B7280'} />
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>{t('categories.colorLabel')}</Text>
            <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16}}>
              {COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setForm(f => ({...f, color: c}))}
                  style={[styles.colorDot, {backgroundColor: c}, form.color === c && styles.colorDotSelected]}
                />
              ))}
            </View>

            <Text style={styles.label}>{t('categories.budgetLabel')}</Text>
            <TextInput style={styles.input} value={form.budgetAmount} onChangeText={v => setForm(f => ({...f, budgetAmount: v}))} placeholder={t('categories.budgetPlaceholder')} placeholderTextColor="#9CA3AF" keyboardType="decimal-pad" />

            <TouchableOpacity style={[styles.saveBtn, saving && {opacity: 0.6}]} onPress={handleSave} disabled={saving}>
              <Text style={styles.saveBtnText}>{saving ? t('common.saving') : editingId ? t('categories.saveChanges') : t('categories.createCategory')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F9FAFB'},
  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6'},
  title: {fontSize: 20, fontWeight: '700', color: '#111827'},
  addBtn: {backgroundColor: '#3e6378', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10},
  addBtnText: {color: '#fff', fontWeight: '600', fontSize: 14},
  card: {backgroundColor: '#fff', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12},
  catName: {fontSize: 15, fontWeight: '600', color: '#111827'},
  budget: {fontSize: 12, color: '#6B7280', marginTop: 2},
  dot: {width: 10, height: 10, borderRadius: 5},
  modal: {flex: 1, backgroundColor: '#fff'},
  modalHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6'},
  modalTitle: {fontSize: 18, fontWeight: '700', color: '#111827'},
  modalBody: {padding: 16, gap: 4, paddingBottom: 40},
  label: {fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 4},
  input: {backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: '#111827', marginBottom: 12},
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorDot: {width: 32, height: 32, borderRadius: 16},
  colorDotSelected: {borderWidth: 3, borderColor: '#111827'},
  saveBtn: {backgroundColor: '#3e6378', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8},
  saveBtnText: {color: '#fff', fontWeight: '600', fontSize: 15},
});
