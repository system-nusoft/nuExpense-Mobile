import en from './locales/en.json';
import fr from './locales/fr.json';
import es from './locales/es.json';
import pt from './locales/pt.json';
import ar from './locales/ar.json';
import hi from './locales/hi.json';
import zh from './locales/zh.json';

export const SUPPORTED_LANGUAGES = ['en', 'fr', 'es', 'pt', 'ar', 'hi', 'zh'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const RTL_LANGUAGES: SupportedLanguage[] = ['ar'];

export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

export const LANGUAGE_STORAGE_KEY = 'zingg_language';

export const resources = {
  en: {translation: en},
  fr: {translation: fr},
  es: {translation: es},
  pt: {translation: pt},
  ar: {translation: ar},
  hi: {translation: hi},
  zh: {translation: zh},
};

export function isSupportedLanguage(value: string | null | undefined): value is SupportedLanguage {
  return !!value && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

export function isRTL(language: string): boolean {
  return RTL_LANGUAGES.includes(language as SupportedLanguage);
}
