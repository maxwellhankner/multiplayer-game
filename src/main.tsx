import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

/** Drop focus after touch so mobile buttons don't stay gray/highlighted. */
document.addEventListener(
  'touchend',
  (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const interactive = target.closest('button, a[href], [role="button"]');
    if (interactive instanceof HTMLElement) {
      interactive.blur();
    }
  },
  { passive: true },
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
