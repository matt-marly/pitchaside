'use client';

import { useCallback, useEffect, useState } from 'react';
import { Sheet } from '@/components/sheet';
import { TeamSheet } from '@/components/team-sheet';
import { getRsvpBoard, type RsvpBoard } from '@/lib/api';

/**
 * "Who's playing" folded to one line: "28 in · 2 waiting · See all". The full team sheet, with
 * Mark in / Mark out, opens in a bottom sheet.
 */
export function SquadSummary({ sessionId, onChange }: { sessionId: string; onChange?: () => void }) {
  const [board, setBoard] = useState<RsvpBoard | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(() => getRsvpBoard(sessionId).then(setBoard).catch(() => {}), [sessionId]);
  useEffect(() => {
    load();
  }, [load]);

  if (!board) return <div className="h-14 mb-3 rounded-2xl bg-white/60 border border-gray-100" aria-hidden />;

  const full = board.in.length >= board.capacity;
  const extras = [
    board.waitlist.length ? `${board.waitlist.length} waiting` : null,
    board.requireRsvp && board.noReply.length ? `${board.noReply.length} no reply` : null,
  ].filter(Boolean);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full mb-3 flex items-center gap-3 min-h-14 px-4 py-2.5 rounded-2xl bg-white border border-gray-100 shadow-card text-left hover:border-ink transition-colors"
        aria-haspopup="dialog"
      >
        <span className="flex items-baseline gap-1 shrink-0">
          <span className="font-display text-2xl font-extrabold text-ink tabular-nums leading-none">{board.in.length}</span>
          <span className="text-xs font-bold text-gray-500 tabular-nums">/{board.capacity} in</span>
        </span>
        <span className="flex-1 min-w-0 text-xs text-gray-600 truncate">
          {extras.length ? extras.join(' · ') : full ? 'Full squad' : 'Nobody waiting'}
        </span>
        <span className="shrink-0 text-xs font-bold text-pitch-700 flex items-center gap-0.5">
          See all
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </span>
      </button>

      {open && (
        <Sheet titleId="whos-playing" onClose={() => setOpen(false)} align="left">
          <TeamSheet
            sessionId={sessionId}
            bare
            titleId="whos-playing"
            onChange={() => {
              load();
              onChange?.();
            }}
          />
          <div className="sticky bottom-0 -mx-6 -mb-6 mt-4 px-6 pt-3 pb-6 bg-white border-t border-gray-100">
            <button
              onClick={() => setOpen(false)}
              className="w-full min-h-12 text-sm font-bold text-ink bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Done
            </button>
          </div>
        </Sheet>
      )}
    </>
  );
}
