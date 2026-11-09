import React, {createContext, useCallback, useContext, useEffect, useState} from 'react';
import {Alert, I18nManager} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from 'i18next';
import {initReactI18next, I18nextProvider, useTranslation} from 'react-i18next';
import {
  resources,
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  SupportedLanguage,
  isSupportedLanguage,
  isRTL,
} from '../i18n/config';

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: DEFAULT_LANGUAGE,
    fallbackLng: DEFAULT_LANGUAGE,
    interpolation: {escapeValue: false},
    compatibilityJSON: 'v4',
  });
}

interface LanguageContextValue {
  language: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => void;
  ready: boolean;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

function LanguageContextBridge({children}: {children: React.ReactNode}) {
  const {i18n: i18nInstance} = useTranslation();
  const [language, setLanguageState] = useState<SupportedLanguage>(DEFAULT_LANGUAGE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(LANGUAGE_STORAGE_KEY).then(stored => {
      const lang = isSupportedLanguage(stored) ? stored : DEFAULT_LANGUAGE;
      i18nInstance.changeLanguage(lang);
      setLanguageState(lang);
      setReady(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLanguage = useCallback(
    (next: SupportedLanguage) => {
      const wasRTL = I18nManager.isRTL;
      const willBeRTL = isRTL(next);

      i18nInstance.changeLanguage(next);
      setLanguageState(next);
      AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, next);

      if (wasRTL !== willBeRTL) {
        I18nManager.allowRTL(willBeRTL);
        I18nManager.forceRTL(willBeRTL);
        Alert.alert(
          willBeRTL ? 'إعادة التشغيل مطلوبة' : 'Restart required',
          willBeRTL
            ? 'يرجى إغلاق التطبيق وإعادة فتحه لتطبيق التخطيط من اليمين إلى اليسار بالكامل.'
            : 'Please close and reopen the app to apply the layout direction change.',
        );
      }
    },
    [i18nInstance],
  );

  if (!ready) {
    return null;
  }

  return (
    <LanguageContext.Provider value={{language, setLanguage, ready}}>
      {children}
    </LanguageContext.Provider>
  );
}

export function LanguageProvider({children}: {children: React.ReactNode}) {
  return (
    <I18nextProvider i18n={i18n}>
      <LanguageContextBridge>{children}</LanguageContextBridge>
    </I18nextProvider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return ctx;
}
