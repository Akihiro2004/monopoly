import { useSyncExternalStore } from 'react';
import { canPromptInstall, isIos, isStandalone, promptInstall, subscribeInstall } from '../pwa.js';

export function useInstall() {
  const canPrompt = useSyncExternalStore(subscribeInstall, canPromptInstall, () => false);
  const standalone = isStandalone();
  return {
    // Android / desktop Chrome & Edge: native prompt available.
    canPrompt,
    // iOS Safari has no prompt: show "Share > Add to Home Screen" help instead.
    showIosHelp: !standalone && isIos(),
    installed: standalone,
    install: promptInstall
  };
}
