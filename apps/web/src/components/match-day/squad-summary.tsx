'use client';

import { useCallback, useEffect, useState } from 'react';
import { Sheet } from '@/components/sheet';
import { TeamSheet } from '@/components/team-sheet';
import { getRsvpBoard, type RsvpBoard } from '@/lib/api';
import { AvatarStack } from '@/components/avatar-stack';
import { CountUp, LiveDot, ProgressRing } from '@/components/motion';

/**
 * "Who's playing" folded to one card: a ring filling towards the squad size, how many spots are
 * left or who's waiting, and the latest faces in. The full team sheet, with
 * Mark in / Mark out, opens in a bottom sheet.
 */
export function SquadSummary({ sessionId, onChange }: { sessionId: string; onChange?: () => void }) {
  const [board, setBoard] = useState<RsvpBoard | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(() => getRsvpBoard(sessionId).then(setBoard).catch(() => {}), [sessionId]);
  useEffect(() => {
    load();
  }, [load]);

  if (!board) return <div className="h-[76px] mb-3 rounded-3xl bg-white/60 border border-gray-100 animate-pulse" aria-hidden />;

  const inCount = board.in.length;
  const full = inCount >= board.capacity;
  const left = Math.max(0, board.capacity - inCount);
  const waiting = board.waitlist.length;
  const noReply = board.requireRsvp ? board.noReply.length : 0;
  const status = full ? (waiting ? `Full · ${waiting} waiting` : 'Full squad') : `${left} spot${left === 1 ? '' : 's'} left`;
  const extra = [full ? null : waiting ? `${waiting} waiting` : null, noReply ? `${noReply} no reply` : null].filter(Boolean).join(' · ');

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="press group animate-rise w-full mb-3 flex items-center gap-3.5 min-h-[76px] pl-3 pr-3.5 py-3 rounded-3xl bg-white border border-gray-100 shadow-card text-left hover:border-ink transition-colors"
        aria-haspopup="dialog"
        aria-label={`Who's playing: ${inCount} of ${board.capacity} in. ${status}${extra ? `. ${extra}` : ''}. See all`}
      >
        <ProgressRing value={inCount} max={board.capacity} size={52} stroke={5} fillClass={full ? 'stroke-volt-400' : 'stroke-pitch-500'}>
          <CountUp value={inCount} className="font-display text-lg font-extrabold text-ink leading-none" />
        </ProgressRing>
        <span className="flex-1 min-w-0">
          <span className="block text-[15px] font-extrabold text-ink leading-tight">
            {inCount} of {board.capacity} in
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-gray-600 min-w-0">
            {waiting > 0 && <LiveDot className="bg-sun-400" />}
            <span className="truncate">
              {status}
              {extra && <span className="text-gray-500"> · {extra}</span>}
            </span>
          </span>
        </span>
        <AvatarStack people={[...board.in].reverse()} total={inCount} max={3} />
        <svg className="w-4 h-4 shrink-0 text-pitch-700 animate-nudge" fill="none" viewBox="0 0 24 24" strokeWidth={2.75} stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
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
