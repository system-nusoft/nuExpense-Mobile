import React, {useState} from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert, Linking,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import {AuthStackParamList} from '../../navigation/AuthNavigator';
import {PRIVACY_POLICY_URL, TERMS_OF_USE_URL} from '../../constants/legal';
import {signupApi} from '../../lib/services/auth.service';
import {getApiErrorMessage} from '../../lib/api';
import BrandWordmark from '../../components/common/BrandWordmark';

type Props = {navigation: NativeStackNavigationProp<AuthStackParamList, 'Signup'>};

export default function SignupScreen({navigation}: Props) {
  const {t} = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert(t('common.error'), t('auth.signup.errorAllFieldsRequired'));
      return;
    }
    setLoading(true);
    try {
      await signupApi(name.trim(), email.trim(), password);
      navigation.navigate('VerifyEmail', {email: email.trim()});
    } catch (err) {
      Alert.alert(t('common.error'), getApiErrorMessage(err, t('auth.signup.errorFailed')));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <BrandWordmark size="lg" style={styles.logo} />
        <Text style={styles.title}>{t('auth.signup.title')}</Text>
        <Text style={styles.subtitle}>{t('auth.signup.subtitle')}</Text>

        <View style={styles.form}>
          <Text style={styles.label}>{t('auth.signup.fullNameLabel')}</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={t('auth.signup.fullNamePlaceholder')}
            placeholderTextColor="#9CA3AF"
            autoCapitalize="words"
          />
          <Text style={styles.label}>{t('auth.emailLabel')}</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#9CA3AF"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.label}>{t('auth.passwordLabel')}</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#9CA3AF"
            secureTextEntry
          />
          <Text style={styles.legal}>
            {t('auth.signup.legalPrefix')}{' '}
            <Text style={styles.legalLink} onPress={() => Linking.openURL(TERMS_OF_USE_URL)}>
              {t('legal.terms')}
            </Text>
            {' '}{t('auth.signup.legalAnd')}{' '}
            <Text style={styles.legalLink} onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
              {t('legal.privacy')}
            </Text>
            .
          </Text>
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignup}
            disabled={loading}>
            <Text style={styles.buttonText}>{loading ? t('auth.signup.creatingAccount') : t('auth.signup.createAccount')}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => navigation.replace('Login')}>
          <Text style={styles.link}>
            {t('auth.signup.haveAccount')} <Text style={styles.linkBold}>{t('auth.signup.signIn')}</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1, backgroundColor: '#F9FAFB'},
  container: {flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24},
  logo: {marginBottom: 4},
  title: {fontSize: 28, fontWeight: '700', color: '#111827', marginBottom: 4},
  subtitle: {fontSize: 14, color: '#6B7280', marginBottom: 32},
  form: {width: '100%', gap: 8, marginBottom: 24},
  label: {fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 2},
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 15, color: '#111827', marginBottom: 8,
  },
  legal: {fontSize: 12, color: '#6B7280', lineHeight: 18, marginBottom: 4, marginTop: 4},
  legalLink: {color: '#3e6378', fontWeight: '600'},
  button: {
    backgroundColor: '#3e6378', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 4,
  },
  buttonDisabled: {opacity: 0.6},
  buttonText: {color: '#fff', fontSize: 15, fontWeight: '600'},
  link: {fontSize: 13, color: '#6B7280'},
  linkBold: {color: '#3e6378', fontWeight: '600'},
});
