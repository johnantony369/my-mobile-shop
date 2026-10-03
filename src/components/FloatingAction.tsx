import React from 'react';
import { createPortal } from 'react-dom';

/**
 * Pins its children to the bottom-right of the viewport (above the tab bar).
 * Rendered through a portal into <body> so no transformed/animated ancestor
 * can turn `position: fixed` into page-relative positioning.
 */
export const FloatingAction: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const el = (
    <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+66px)] right-5 sm:right-[max(1.25rem,calc((100vw-32rem)/2+1.25rem))] z-30 flex flex-col items-end gap-3">
      {children}
    </div>
  );
  if (typeof document !== 'undefined') {
    return createPortal(el, document.body);
  }
  return el;
};
