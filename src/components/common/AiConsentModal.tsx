import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Pressable,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {
  AI_DATA_PROCESSOR_NAME,
  AI_DATA_PROCESSOR_PRIVACY_URL,
  PRIVACY_POLICY_URL,
} from '../../constants/legal';
import Icon from './Icon';

type Props = {
  visible: boolean;
  onAllow: () => void;
  onDeny: () => void;
};

/**
 * Guideline 5.1.2(i): disclose what is sent, who receives it, and get explicit
 * permission before sharing personal data with a third-party AI service.
 */
export default function AiConsentModal({visible, onAllow, onDeny}: Props) {
  const {t} = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDeny}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDeny} />
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Icon name="cpu" size={22} color="#3e6378" />
          </View>
          <Text style={styles.title}>{t('aiConsent.title')}</Text>
          <Text style={styles.body}>
            {t('aiConsent.body', {provider: AI_DATA_PROCESSOR_NAME})}
          </Text>

          <View style={styles.bulletList}>
            <View style={styles.bulletRow}>
              <Icon name="image" size={14} color="#3e6378" />
              <Text style={styles.bulletText}>{t('aiConsent.bulletReceipts')}</Text>
            </View>
            <View style={styles.bulletRow}>
              <Icon name="file-text" size={14} color="#3e6378" />
              <Text style={styles.bulletText}>{t('aiConsent.bulletExpenses')}</Text>
            </View>
          </View>

          <Text style={styles.purpose}>
            {t('aiConsent.purpose', {provider: AI_DATA_PROCESSOR_NAME})}
          </Text>

          <TouchableOpacity
            onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
            hitSlop={8}
            style={styles.linkRow}
          >
            <Text style={styles.link}>{t('aiConsent.privacyLink')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => Linking.openURL(AI_DATA_PROCESSOR_PRIVACY_URL)}
            hitSlop={8}
            style={styles.linkRow}
          >
            <Text style={styles.link}>
              {t('aiConsent.providerPrivacyLink', {provider: AI_DATA_PROCESSOR_NAME})}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.allowBtn} onPress={onAllow} activeOpacity={0.85}>
            <Text style={styles.allowText}>{t('aiConsent.allow')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.denyBtn} onPress={onDeny} activeOpacity={0.85}>
            <Text style={styles.denyText}>{t('aiConsent.deny')}</Text>
          </TouchableOpacity>
          <Text style={styles.footnote}>{t('aiConsent.footnote')}</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(26, 47, 58, 0.55)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E8EEF2',
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#EEF4F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A2F3A',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    color: '#5B6B75',
    marginBottom: 14,
  },
  bulletList: {gap: 10, marginBottom: 14},
  bulletRow: {flexDirection: 'row', alignItems: 'flex-start', gap: 10},
  bulletText: {flex: 1, fontSize: 14, lineHeight: 20, color: '#1A2F3A'},
  purpose: {
    fontSize: 13,
    lineHeight: 19,
    color: '#5B6B75',
    marginBottom: 12,
  },
  linkRow: {marginBottom: 6},
  link: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3e6378',
    textDecorationLine: 'underline',
  },
  allowBtn: {
    marginTop: 16,
    backgroundColor: '#3e6378',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  allowText: {color: '#fff', fontWeight: '700', fontSize: 15},
  denyBtn: {
    marginTop: 10,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D7E2E9',
    backgroundColor: '#fff',
  },
  denyText: {color: '#1A2F3A', fontWeight: '700', fontSize: 15},
  footnote: {
    marginTop: 12,
    fontSize: 12,
    lineHeight: 17,
    color: '#8A9AA4',
    textAlign: 'center',
  },
});
