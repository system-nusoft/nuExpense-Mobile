import React, {useState} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Modal} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useLanguage} from '../../contexts/LanguageContext';
import {SUPPORTED_LANGUAGES} from '../../i18n/config';
import Icon from './Icon';

export default function LanguagePicker() {
  const {t} = useTranslation();
  const {language, setLanguage} = useLanguage();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={() => setOpen(true)}>
        <Text style={styles.triggerText}>{t(`language.${language}`)}</Text>
        <Icon name="chevron-down" size={18} color="#9CA3AF" />
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={[styles.sheet, {paddingBottom: insets.bottom + 16}]}>
            <Text style={styles.sheetTitle}>{t('language.selectLanguage')}</Text>
            {SUPPORTED_LANGUAGES.map(code => (
              <TouchableOpacity
                key={code}
                style={styles.row}
                onPress={() => {
                  setLanguage(code);
                  setOpen(false);
                }}>
                <Text style={[styles.rowText, language === code && styles.rowTextActive]}>
                  {t(`language.${code}`)}
                </Text>
                {language === code && <Icon name="check" size={18} color="#3e6378" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
  },
  triggerText: {fontSize: 15, color: '#111827'},
  backdrop: {flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end'},
  sheet: {backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16},
  sheetTitle: {fontSize: 13, fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8},
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  rowText: {fontSize: 16, color: '#374151'},
  rowTextActive: {color: '#3e6378', fontWeight: '600'},
});
