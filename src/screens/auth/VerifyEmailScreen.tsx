import React, {useState} from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RouteProp} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {AuthStackParamList} from '../../navigation/AuthNavigator';
import {verifyEmailApi, resendOtpApi} from '../../lib/services/auth.service';
import {getApiErrorMessage} from '../../lib/api';
import {useAuth} from '../../contexts/AuthContext';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'VerifyEmail'>;
  route: RouteProp<AuthStackParamList, 'VerifyEmail'>;
};

export default function VerifyEmailScreen({navigation, route}: Props) {
  const {t} = useTranslation();
  const {login} = useAuth();
  const {email} = route.params;
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleVerify() {
    if (otp.length !== 6) {
      Alert.alert(t('common.error'), t('auth.verifyEmail.errorEnterCode'));
      return;
    }
    setLoading(true);
    try {
      const {accessToken, refreshToken, user} = await verifyEmailApi(email, otp);
      await login(accessToken, refreshToken, user);
    } catch (err) {
      Alert.alert(t('common.error'), getApiErrorMessage(err, t('auth.verifyEmail.errorInvalidCode')));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    try {
      await resendOtpApi(email);
      Alert.alert(t('auth.verifyEmail.resendSentTitle'), t('auth.verifyEmail.resendSentMessage'));
    } catch (err) {
      Alert.alert(t('common.error'), getApiErrorMessage(err, t('auth.verifyEmail.resendError')));
    } finally {
      setResending(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{t('auth.verifyEmail.title')}</Text>
        <Text style={styles.subtitle}>
          {t('auth.verifyEmail.sentCode')}{'\n'}
          <Text style={styles.email}>{email}</Text>
        </Text>

        <View style={styles.form}>
          <TextInput
            style={[styles.input, styles.otpInput]}
            value={otp}
            onChangeText={setOtp}
            placeholder="000000"
            placeholderTextColor="#9CA3AF"
            keyboardType="number-pad"
            maxLength={6}
          />
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleVerify}
            disabled={loading}>
            <Text style={styles.buttonText}>{loading ? t('auth.verifyEmail.verifying') : t('auth.verifyEmail.verify')}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={handleResend} disabled={resending}>
          <Text style={styles.link}>
            {resending ? t('auth.verifyEmail.sending') : t('auth.verifyEmail.noReceiveResend')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={{marginTop: 12}}>
          <Text style={styles.link}>{t('auth.verifyEmail.backToLogin')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1, backgroundColor: '#F9FAFB'},
  container: {flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24},
  title: {fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 8, textAlign: 'center'},
  subtitle: {fontSize: 14, color: '#6B7280', marginBottom: 32, textAlign: 'center', lineHeight: 22},
  email: {fontWeight: '600', color: '#374151'},
  form: {width: '100%', gap: 12, marginBottom: 24},
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 15, color: '#111827',
  },
  otpInput: {textAlign: 'center', fontSize: 28, letterSpacing: 8, fontWeight: '700'},
  button: {
    backgroundColor: '#3e6378', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  buttonDisabled: {opacity: 0.6},
  buttonText: {color: '#fff', fontSize: 15, fontWeight: '600'},
  link: {fontSize: 13, color: '#3e6378'},
});
