import { useEffect, useState } from 'react';

function checkLandscape(): boolean {
  if (typeof window.matchMedia === 'function') {
    if (window.matchMedia('(orientation: landscape)').matches) return true;
    if (window.matchMedia('(orientation: portrait)').matches) return false;
  }
  return window.innerWidth > window.innerHeight;
}

export function useIsLandscape(): boolean {
  const [landscape, setLandscape] = useState(checkLandscape);

  useEffect(() => {
    const update = () => setLandscape(checkLandscape());
    const portraitQuery = window.matchMedia?.('(orientation: portrait)');

    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    portraitQuery?.addEventListener('change', update);

    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      portraitQuery?.removeEventListener('change', update);
    };
  }, []);

  return landscape;
}
