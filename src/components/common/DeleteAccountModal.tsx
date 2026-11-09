import React, {useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useAuth} from '../../contexts/AuthContext';
import {deleteAccountApi} from '../../lib/services/auth.service';
import {getApiErrorMessage} from '../../lib/api';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function DeleteAccountModal({visible, onClose}: Props) {
  const {t} = useTranslation();
  const {logout} = useAuth();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    if (loading) {return;}
    setPassword('');
    setError(null);
    onClose();
  }

  async function handleDelete() {
    setError(null);
    setLoading(true);
    try {
      await deleteAccountApi(password);
      // Account is gone server-side; logout clears local tokens and returns to the auth stack.
      await logout();
    } catch (err) {
      setError(getApiErrorMessage(err, t('deleteAccount.error')));
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.card}>
          <Text style={styles.title}>{t('deleteAccount.modalTitle')}</Text>
          <Text style={styles.body}>{t('deleteAccount.modalBody')}</Text>
          {error && <Text style={styles.error}>{error}</Text>}
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder={t('deleteAccount.passwordLabel')}
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            autoCapitalize="none"
            editable={!loading}
          />
          <View style={styles.row}>
            <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={close} disabled={loading}>
              <Text style={styles.cancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.deleteBtn, (!password || loading) && styles.disabled]}
              onPress={handleDelete}
              disabled={!password || loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.deleteText}>{t('deleteAccount.confirm')}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24},
  card: {backgroundColor: '#fff', borderRadius: 16, padding: 20},
  title: {fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8},
  body: {fontSize: 14, color: '#4B5563', lineHeight: 20, marginBottom: 14},
  error: {fontSize: 13, color: '#DC2626', marginBottom: 10},
  input: {borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: '#111827', marginBottom: 16},
  row: {flexDirection: 'row', gap: 12},
  btn: {flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center', justifyContent: 'center'},
  cancelBtn: {backgroundColor: '#F3F4F6'},
  cancelText: {color: '#374151', fontWeight: '600', fontSize: 15},
  deleteBtn: {backgroundColor: '#DC2626'},
  deleteText: {color: '#fff', fontWeight: '600', fontSize: 15},
  disabled: {opacity: 0.5},
});
