'use client';

import Link from 'next/link';
import { BallSpinner } from '@/components/skeleton';
import { prettyTime } from '@/components/player-ui';
import { formatCurrency } from '@/lib/api';
import type { UpcomingGame } from '@/lib/player';
import { isFull, shortDate, useRsvp } from './use-rsvp';

/** A later game: date tile, spots, and your answer — or an inline "I'm in" if you haven't given one. */
export function ComingUpRow({ game, onChange }: { game: UpcomingGame; onChange: () => Promise<unknown> }) {
  const { busy, landed, reply } = useRsvp(game, onChange);
  const d = new Date(`${game.date.slice(0, 10)}T00:00:00`);
  const time = prettyTime(game.kickoffTime);
  const full = isFull(game);
  const fresh = landed && landed === game.myStatus ? 'animate-stamp' : '';

  const spots = game.requireRsvp
    ? full
      ? `Full${game.waitlist ? ` · ${game.waitlist} waiting` : ''}`
      : `${game.confirmed} of ${game.capacity} in`
    : null;

  return (
    <div className="flex items-center gap-3 bg-white rounded-2xl p-2.5 pr-3 border border-gray-100 shadow-card">
      <Link href={`/me/games/${game.id}`} className="flex flex-1 min-w-0 items-center gap-3 rounded-xl">
        <span className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-gray-200 text-center" aria-hidden>
          <span className="block bg-kit-500 text-white text-[10px] font-extrabold uppercase tracking-wider py-0.5">
            {d.toLocaleDateString('en-GB', { month: 'short' })}
          </span>
          <span className="block font-display text-lg font-extrabold text-ink leading-7">{d.getDate()}</span>
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-bold text-ink truncate">
            {shortDate(game.date)}
            {time ? ` · ${time}` : ''}
          </span>
          {(spots || game.myStatus === 'out') && (
            <span className="block text-xs text-gray-600 mt-0.5 tabular-nums truncate">
              {[spots, game.myStatus === 'out' ? 'You said no' : null].filter(Boolean).join(' · ')}
            </span>
          )}
        </span>
      </Link>

      {game.myStatus === 'in' ? (
        <span className="shrink-0 text-right">
          <span className={`inline-block rotate-[-4deg] rounded-lg border-2 border-ink bg-volt-400 px-2 py-0.5 text-xs font-extrabold text-ink ${fresh}`}>
            You’re in
          </span>
          {game.payment && (
            <span className={`block mt-1 text-[11px] font-bold ${game.payment.status === 'pending' ? 'text-amber-800' : 'text-pitch-700'}`}>
              {game.payment.status === 'pending' ? `${formatCurrency(game.payment.amount)} to pay` : 'Paid ✓'}
            </span>
          )}
        </span>
      ) : game.myStatus === 'waitlist' ? (
        <span className={`shrink-0 inline-block rotate-[-4deg] rounded-lg border-2 border-ink bg-sun-400 px-2 py-0.5 text-xs font-extrabold text-ink ${fresh}`}>
          Waitlist #{game.waitlistPosition ?? '–'}
        </span>
      ) : (
        <button
          onClick={() => reply('in')}
          disabled={!!busy}
          className="shrink-0 min-h-11 px-4 flex items-center gap-1.5 rounded-xl bg-ink text-sm font-extrabold text-volt-300 hover:bg-pitch-900 disabled:opacity-60"
          aria-label={`${full ? 'Join the waitlist' : 'I’m in'} for ${shortDate(game.date)}`}
        >
          {busy === 'in' && <BallSpinner />}
          {full ? 'Join waitlist' : 'I’m in'}
        </button>
      )}
    </div>
  );
}
