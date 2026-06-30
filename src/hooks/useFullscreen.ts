import { useCallback, useEffect, useState } from 'react';

const PSEUDO_CLASS = 'pseudo-fullscreen';

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: (options?: unknown) => Promise<void> | void;
};

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

function isNativeFullscreen(): boolean {
  const doc = document as FullscreenDocument;
  return !!(document.fullscreenElement ?? doc.webkitFullscreenElement);
}

function isPseudoFullscreen(): boolean {
  return document.documentElement.classList.contains(PSEUDO_CLASS);
}

function readFullscreenState(): boolean {
  return isNativeFullscreen() || isPseudoFullscreen();
}

function requestNativeFullscreen(): Promise<boolean> {
  const el = document.documentElement as FullscreenElement;
  const options = { navigationUI: 'hide' as const };

  const tryRequest = (target: Element & FullscreenElement): Promise<boolean> | null => {
    try {
      if (!target.requestFullscreen && !target.webkitRequestFullscreen) return null;
      const result = target.requestFullscreen?.(options) ?? target.webkitRequestFullscreen?.(options);
      if (result && typeof (result as Promise<void>).then === 'function') {
        return (result as Promise<void>).then(() => true).catch(() => false);
      }
      return Promise.resolve(true);
    } catch {
      return Promise.resolve(false);
    }
  };

  return tryRequest(el) ?? tryRequest(document.body as Element & FullscreenElement) ?? Promise.resolve(false);
}

async function exitNativeFullscreen(): Promise<void> {
  const doc = document as FullscreenDocument;
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
  } catch {
    // fall through
  }

  try {
    if (doc.webkitExitFullscreen) {
      await doc.webkitExitFullscreen();
    }
  } catch {
    // fall through
  }
}

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(readFullscreenState);

  useEffect(() => {
    const sync = () => setIsFullscreen(readFullscreenState());
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync);
    };
  }, []);

  const enterFullscreen = useCallback(() => {
    void requestNativeFullscreen().then((entered) => {
      if (entered) {
        setIsFullscreen(true);
        return;
      }
      document.documentElement.classList.add(PSEUDO_CLASS);
      setIsFullscreen(true);
    });
  }, []);

  const exitFullscreen = useCallback(() => {
    document.documentElement.classList.remove(PSEUDO_CLASS);
    void exitNativeFullscreen().then(() => setIsFullscreen(readFullscreenState()));
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (readFullscreenState()) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  }, [enterFullscreen, exitFullscreen]);

  return { isFullscreen, toggleFullscreen };
}
