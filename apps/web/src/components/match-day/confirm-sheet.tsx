'use client';

import { Sheet } from '@/components/sheet';

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
      <h3 id="confirm-sheet" className="font-display text-xl font-extrabold text-ink mb-1">
        {title}
      </h3>
      <p className="text-sm text-gray-600 mb-5">{message}</p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 min-h-12 text-sm font-bold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
          {cancelLabel}
        </button>
        <button
          onClick={onConfirm}
          className={`flex-1 min-h-12 text-sm font-bold rounded-xl transition-colors ${
            danger ? 'bg-kit-500 text-white hover:bg-kit-600' : 'bg-ink text-volt-300 hover:bg-pitch-900'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Sheet>
  );
}
