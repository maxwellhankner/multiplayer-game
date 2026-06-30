import { useEffect, useState } from 'react';

function checkLandscape(): boolean {
  return window.innerWidth > window.innerHeight;
}

export function useIsLandscape(): boolean {
  const [landscape, setLandscape] = useState(checkLandscape);

  useEffect(() => {
    const update = () => setLandscape(checkLandscape());
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return landscape;
}
