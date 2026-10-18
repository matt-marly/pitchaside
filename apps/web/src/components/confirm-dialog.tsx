'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { btnDanger, btnPrimary, btnSecondary } from '@/components/buttons';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [mounted, setMounted] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const messageId = useId();
  useEffect(() => setMounted(true), []);

  // Start on the safe choice, and hand focus back to whatever opened the dialog when it closes.
  useEffect(() => {
    if (!open || !mounted) return;
    const opener = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus({ preventScroll: true });
    return () => {
      if (opener && opener.isConnected && opener !== document.body) opener.focus({ preventScroll: true });
    };
  }, [open, mounted]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    window.addEventListener('keydown', handleKey);
    // Stop the page scrolling behind the sheet.
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onCancel]);

  if (!open || !mounted) return null;

  // Portal to <body> so the sheet sits above the phone tab bar and isn't
  // trapped inside an animated (transformed) page wrapper.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={messageId}
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-ink/50 backdrop-blur-sm px-0 sm:px-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-t-[28px] sm:rounded-3xl shadow-lift w-full sm:max-w-md p-6 pb-[max(env(safe-area-inset-bottom),1.5rem)] sm:pb-6 animate-slide-up sm:animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-4 ${variant === 'danger' ? 'bg-kit-500/15 text-kit-600' : 'bg-volt-300 text-ink'}`}>
          {variant === 'danger' ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          )}
        </div>
        <h3 id={titleId} className="font-display text-xl font-extrabold text-ink leading-tight mb-1.5">{title}</h3>
        <p id={messageId} className="text-sm text-gray-600 leading-relaxed mb-6">{message}</p>
        <div className="flex gap-3">
          <button ref={cancelRef} onClick={onCancel} className={`flex-1 ${btnSecondary}`}>
            {cancelLabel}
          </button>
          <button onClick={onConfirm} className={`flex-1 ${variant === 'danger' ? btnDanger : btnPrimary}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
