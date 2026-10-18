'use client';

import { type ReactNode, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Bottom sheet on phones, centred card on larger screens. Escape or a tap outside closes it.
 * `art` is an optional illustration band on top; tall content scrolls inside the sheet.
 * Focus moves into the sheet when it opens, Tab stays inside it, and focus goes back to
 * whatever opened it when it closes.
 */
export function Sheet({
  titleId,
  onClose,
  art,
  align = 'center',
  children,
}: {
  titleId: string;
  onClose: () => void;
  art?: ReactNode;
  align?: 'center' | 'left';
  children: ReactNode;
}) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    // Focus the sheet itself so screen readers start at its title, not halfway down.
    panelRef.current?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return closeRef.current();
      if (e.key !== 'Tab' || !panelRef.current) return;
      // Another dialog opened on top of this one owns the keyboard.
      const dialogs = document.querySelectorAll('[role="dialog"]');
      if (dialogs[dialogs.length - 1] !== panelRef.current.parentElement) return;
      // Keep Tab inside the sheet while it's open.
      const items = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (!items.length) return e.preventDefault();
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panelRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !panelRef.current.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    // Stop the page scrolling behind the sheet.
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      // Back to the button that opened it, if it's still on the page.
      if (opener && opener.isConnected && opener !== document.body) opener.focus({ preventScroll: true });
    };
  }, []);

  // Portal to <body> so the sheet sits above the phone tab bar.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-ink/50 backdrop-blur-sm px-0 sm:px-4"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="bg-white rounded-t-3xl sm:rounded-3xl shadow-lift w-full sm:max-w-sm max-h-[92vh] overflow-y-auto outline-none animate-slide-up sm:animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {art && <div className="bg-volt-300 chalk-dots pt-5 flex justify-center">{art}</div>}
        <div className={`p-6 pb-[max(env(safe-area-inset-bottom),1.5rem)] sm:pb-6 ${align === 'center' ? 'text-center' : ''}`}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}
