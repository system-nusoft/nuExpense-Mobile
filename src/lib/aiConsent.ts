import AsyncStorage from '@react-native-async-storage/async-storage';

/** Bump when the AI provider or categories of shared data change. */
const AI_CONSENT_KEY = 'zingg_ai_consent_v1';

export type AiConsentStatus = 'granted' | 'denied';

export async function getAiConsentStatus(): Promise<AiConsentStatus | null> {
  const value = await AsyncStorage.getItem(AI_CONSENT_KEY);
  if (value === 'granted' || value === 'denied') {
    return value;
  }
  return null;
}

export async function hasAiConsent(): Promise<boolean> {
  return (await getAiConsentStatus()) === 'granted';
}

export async function setAiConsent(status: AiConsentStatus): Promise<void> {
  await AsyncStorage.setItem(AI_CONSENT_KEY, status);
}

export async function clearAiConsent(): Promise<void> {
  await AsyncStorage.removeItem(AI_CONSENT_KEY);
}
