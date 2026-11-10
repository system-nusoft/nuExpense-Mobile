import {useCallback, useRef, useState} from 'react';
import {hasAiConsent, setAiConsent} from '../lib/aiConsent';

/**
 * Gates AI-bound actions behind Guideline 5.1.2(i) consent.
 * Call `runWithAiConsent(action)` before any request that shares personal data with third-party AI.
 */
export function useAiConsentGate() {
  const [visible, setVisible] = useState(false);
  const pendingRef = useRef<(() => void) | null>(null);

  const runWithAiConsent = useCallback(async (action: () => void) => {
    if (await hasAiConsent()) {
      action();
      return;
    }
    pendingRef.current = action;
    setVisible(true);
  }, []);

  const onAllow = useCallback(async () => {
    await setAiConsent('granted');
    setVisible(false);
    const next = pendingRef.current;
    pendingRef.current = null;
    next?.();
  }, []);

  const onDeny = useCallback(async () => {
    await setAiConsent('denied');
    pendingRef.current = null;
    setVisible(false);
  }, []);

  return {aiConsentVisible: visible, runWithAiConsent, onAllowAiConsent: onAllow, onDenyAiConsent: onDeny};
}
