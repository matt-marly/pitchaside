'use client';

import { Sheet } from '@/components/sheet';
import { btnDanger, btnPrimary, btnSecondary } from '@/components/buttons';

/**
 * A ConfirmDialog whose "no" button can be named too ("Keep game"), for when "Cancel" would be
 * ambiguous next to "Cancel game".
 * TODO: fold into ConfirmDialog as a `cancelLabel` prop.
 */
export function ConfirmSheet({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <Sheet titleId="confirm-sheet" onClose={onCancel} align="left">
      <h3 id="confirm-sheet" className="font-display text-xl font-extrabold text-ink leading-tight mb-1.5">
        {title}
      </h3>
      <p className="text-sm text-gray-600 leading-relaxed mb-6">{message}</p>
      <div className="flex gap-3">
        <button onClick={onCancel} className={`flex-1 ${btnSecondary}`}>
          {cancelLabel}
        </button>
        <button onClick={onConfirm} className={`flex-1 ${danger ? btnDanger : btnPrimary}`}>
          {confirmLabel}
        </button>
      </div>
    </Sheet>
  );
}
