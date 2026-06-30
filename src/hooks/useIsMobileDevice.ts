import { useEffect, useState } from 'react';

const MOBILE_QUERY = '(max-width: 768px), (pointer: coarse)';

function readIsMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(MOBILE_QUERY).matches;
}

/** True on phones/tablets — used to hide desktop-only UI like fullscreen. */
export function useIsMobileDevice(): boolean {
  const [isMobile, setIsMobile] = useState(readIsMobile);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  return isMobile;
}
