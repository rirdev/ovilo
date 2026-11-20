export const isTauri = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};

export const isWeb = (): boolean => {
  return !isTauri();
};

export const openExternalUrl = async (url: string) => {
  if (isTauri()) {
    try {
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      await openUrl(url);
      return;
    } catch (_) {}
  }
  window.open(url, '_blank', 'noopener,noreferrer');
};
