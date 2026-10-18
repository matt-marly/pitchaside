'use client';

import { useId, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { regenerateGroupInvite, type GroupBilling, type IGroupWithMembers } from '@/lib/api';
import { Sheet } from '@/components/sheet';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { useToast } from '@/components/toast';
import { SheetTitle } from '@/components/home/sheet-title';
import { btnPrimary, btnSecondary } from '@/components/buttons';

/**
 * Bringing someone new in: the group link with Copy and WhatsApp, a QR code to scan at the
 * pitch, and (tucked away, with a warning) a fresh link if the old one has got around.
 */
export function InviteSheet({
  group,
  billing,
  canManage,
  onBilling,
  onClose,
}: {
  group: IGroupWithMembers;
  billing: GroupBilling;
  canManage: boolean;
  onBilling: (b: GroupBilling) => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const toast = useToast();
  const [showQr, setShowQr] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [busy, setBusy] = useState(false);
  // Bumped on each new link so the link box washes volt again.
  const [fresh, setFresh] = useState(0);
  const text = `Join ${group.name} on PitchAside to see when we're playing and where to pay: ${billing.link}`;

  const copy = () =>
    navigator.clipboard.writeText(billing.link).then(
      () => toast.success('Link copied'),
      () => toast.error('Could not copy. Press and hold the link to copy it instead.'),
    );

  async function regenerate() {
    setConfirmRegen(false);
    setBusy(true);
    try {
      onBilling(await regenerateGroupInvite(group.id));
      setFresh((n) => n + 1);
      toast.success('New link ready. Share it again: the old one no longer works.');
    } catch {
      toast.error('Could not make a new link. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet titleId={titleId} onClose={onClose} align="left">
      <SheetTitle id={titleId} title="Invite players" sub={`Anyone with the link can join ${group.name}`} onClose={onClose} />

      <div key={fresh} className={`mt-4 rounded-2xl bg-chalk border border-gray-200 px-3.5 py-3 ${fresh ? 'animate-glow' : ''}`}>
        <p className="text-[11px] font-bold text-gray-600">Group link</p>
        <p className="mt-0.5 text-sm font-semibold text-ink break-all select-all">{billing.link}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3">
        <button
          onClick={copy}
          className={btnPrimary}
        >
          Copy link
        </button>
        <button
          onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')}
          className="press min-h-12 flex items-center justify-center gap-2 rounded-2xl text-[15px] font-bold text-ink bg-[#25D366] hover:brightness-95 transition"
        >
          Send on WhatsApp
        </button>
      </div>

      <button
        onClick={() => setShowQr((s) => !s)}
        aria-expanded={showQr}
        className="mt-4 h-11 w-full flex items-center justify-between text-sm font-bold text-ink border-t border-gray-100"
      >
        {showQr ? 'Hide QR code' : 'Show QR code to scan'}
        <svg className={`w-4 h-4 transition-transform ${showQr ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
      </button>
      {showQr && (
        <div className="animate-pop-in flex flex-col items-center gap-2 pb-2">
          <div className="rounded-2xl bg-white border border-gray-200 p-3">
            <QRCodeCanvas value={billing.link} size={168} level="M" />
          </div>
          <p className="text-[11px] text-gray-600">New players scan it with their camera to join</p>
        </div>
      )}

      {canManage && (
        <div className="mt-2 flex items-center gap-3 rounded-2xl border border-gray-200 px-3.5 py-3">
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-bold text-ink">Reset link</span>
            <span className="block text-xs text-gray-600 mt-0.5 leading-snug">
              Makes a new link. The old one stops working straight away.
            </span>
          </span>
          <button onClick={() => setConfirmRegen(true)} disabled={busy} className={`shrink-0 ${btnSecondary} min-h-11 px-3.5 text-sm`}>
            {busy ? 'Resetting…' : 'Reset'}
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirmRegen}
        title="Reset the group link?"
        message="The current link stops working straight away. Anyone who hasn't joined yet will need the new one. People already in the group aren't affected."
        confirmLabel="Reset link"
        variant="danger"
        onConfirm={regenerate}
        onCancel={() => setConfirmRegen(false)}
      />
    </Sheet>
  );
}
