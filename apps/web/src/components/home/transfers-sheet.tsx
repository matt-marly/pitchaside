'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import { formatCurrency, type BankTransfer } from '@/lib/api';
import { Sheet } from '@/components/sheet';
import { stagger } from '@/components/motion';
import { SheetTitle } from '@/components/home/sheet-title';

/** Who a transfer came from, as a short name: the matched player, else the bank's sender name. */
export function transferName(t: BankTransfer) {
  const p = t.player ?? t.payment?.player;
  if (p) return `${p.firstName} ${p.lastName ? `${p.lastName.charAt(0)}.` : ''}`.trim();
  const words = (t.senderName ?? '').trim().toLowerCase().split(/\s+/).filter(Boolean).slice(0, 2);
  return words.length ? words.map((w) => w[0].toUpperCase() + w.slice(1)).join(' ') : 'Unknown sender';
}

const STATUS: Record<BankTransfer['status'], { label: string; cls: string }> = {
  matched: { label: 'Matched', cls: 'bg-pitch-50 text-pitch-700' },
  assigned: { label: 'Matched', cls: 'bg-pitch-50 text-pitch-700' },
  unmatched: { label: 'Needs matching', cls: 'bg-sun-400/20 text-ink' },
  ignored: { label: 'Not for the group', cls: 'bg-gray-100 text-gray-600' },
};

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/**
 * The latest transfers into the group account, newest first. Tapping one shows its details in
 * place (who sent it, when, the bank's narration, what it paid for); the full history and
 * matching live on the group's Transfers tab.
 */
export function TransfersSheet({
  transfers,
  groupId,
  hidden,
  openId,
  onClose,
}: {
  transfers: BankTransfer[];
  groupId: string;
  hidden: boolean;
  /** Open on this transfer's details. */
  openId?: string | null;
  onClose: () => void;
}) {
  const titleId = useId();
  const [open, setOpen] = useState<string | null>(openId ?? null);
  const list = [...transfers].sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()).slice(0, 20);
  const historyHref = `/groups/${groupId}?tab=transfers`;

  return (
    <Sheet titleId={titleId} onClose={onClose} align="left">
      <SheetTitle id={titleId} title="Money in" sub="Latest transfers into the group account" onClose={onClose} />

      {list.length === 0 ? (
        <p className="mt-4 text-sm text-gray-600">No transfers yet.</p>
      ) : (
        <ul className="mt-3 -mx-2">
          {list.map((t, i) => {
            const isOpen = open === t.id;
            const st = STATUS[t.status];
            const p = t.player ?? t.payment?.player;
            return (
              <li key={t.id} className="animate-rise" style={stagger(i, 30)}>
                <button
                  onClick={() => setOpen(isOpen ? null : t.id)}
                  aria-expanded={isOpen}
                  className="press w-full flex items-center gap-3 px-2 py-2.5 rounded-2xl text-left hover:bg-chalk transition-colors"
                >
                  <span
                    className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-sm font-extrabold ${
                      t.status === 'unmatched' ? 'bg-sun-400 text-ink' : 'bg-pitch-50 text-pitch-700'
                    }`}
                    aria-hidden
                  >
                    {t.status === 'unmatched' ? '?' : transferName(t).charAt(0)}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-bold text-ink truncate">{transferName(t)}</span>
                    <span className="block text-xs text-gray-600 tabular-nums">{when(t.receivedAt)}</span>
                  </span>
                  <span className="text-right shrink-0">
                    <span className="block font-display text-[15px] font-extrabold text-ink tabular-nums">
                      {hidden ? '+₦•••' : `+${formatCurrency(t.amount)}`}
                    </span>
                    <span className={`inline-block mt-0.5 px-1.5 rounded-md text-[10px] font-bold ${st.cls}`}>{st.label}</span>
                  </span>
                  <svg
                    className={`w-4 h-4 shrink-0 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                    stroke="currentColor"
                    aria-hidden
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
                {isOpen && (
                  <dl className="animate-slide-down mx-2 mb-2 rounded-2xl bg-chalk px-3.5 py-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px]">
                    <dt className="text-gray-600">From</dt>
                    <dd className="font-semibold text-ink break-words">{t.senderName || 'Not given by the bank'}</dd>
                    <dt className="text-gray-600">Received</dt>
                    <dd className="font-semibold text-ink">{when(t.receivedAt)}</dd>
                    <dt className="text-gray-600">Narration</dt>
                    <dd className="font-semibold text-ink break-words">{t.narration ? `“${t.narration}”` : 'None'}</dd>
                    <dt className="text-gray-600">Paid for</dt>
                    <dd className="font-semibold text-ink">
                      {t.status === 'unmatched'
                        ? 'Not matched to a player yet'
                        : t.status === 'ignored'
                          ? 'Marked as not for the group'
                          : p
                            ? `${p.firstName} ${p.lastName ?? ''}`.trim() + (t.payment?.session?.label ? ` · ${t.payment.session.label}` : t.payment ? '' : ' · held as credit')
                            : '—'}
                    </dd>
                    {t.status === 'unmatched' && (
                      <dd className="col-span-2 mt-1.5">
                        <Link
                          href={`${historyHref}&transfer=${t.id}`}
                          className="press flex items-center justify-center h-11 rounded-xl bg-ink text-volt-300 text-sm font-bold"
                        >
                          Match to a player
                        </Link>
                      </dd>
                    )}
                  </dl>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Link
        href={historyHref}
        className="mt-2 h-12 w-full flex items-center justify-between text-sm font-bold text-ink border-t border-gray-100"
      >
        Full transfer history
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
      </Link>
    </Sheet>
  );
}
