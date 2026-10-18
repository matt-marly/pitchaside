'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { BallSpinner } from '@/components/skeleton';
import { daysUntil, prettyTime } from '@/components/player-ui';
import { formatCurrency } from '@/lib/api';
import { getPlayerGame, type UpcomingGame } from '@/lib/player';
import { TicketBibs } from './ticket-bibs';
import { isFull, kickoffPassed, shortDate, useRsvp } from './use-rsvp';

/* Half-circle bites out of both edges where the two halves of the ticket meet. */
const NOTCH = 14;
const bite = (y: '0' | '100%') =>
  [
    `radial-gradient(circle ${NOTCH}px at 0 ${y}, transparent ${NOTCH - 0.5}px, #000 ${NOTCH}px) left / 51% 100% no-repeat`,
    `radial-gradient(circle ${NOTCH}px at 100% ${y}, transparent ${NOTCH - 0.5}px, #000 ${NOTCH}px) right / 51% 100% no-repeat`,
  ].join(', ');
const notchBottom: CSSProperties = { WebkitMask: bite('100%'), mask: bite('100%') };
const notchTop: CSSProperties = { WebkitMask: bite('0'), mask: bite('0') };

/** The rubber stamp: volt for "You're in", sun for a place on the waitlist. */
function Stamp({ kind, place, fresh }: { kind: 'in' | 'waitlist'; place: number | null; fresh: boolean }) {
  return (
    <span
      className={`inline-block rotate-[-6deg] rounded-xl border-[3px] border-ink px-3 py-1.5 shadow-sticker text-ink ${
        kind === 'in' ? 'bg-volt-400' : 'bg-sun-400'
      } ${fresh ? 'animate-stamp' : ''}`}
    >
      <span className="block rounded-md border border-dashed border-ink/50 px-2 py-0.5 font-display text-lg font-extrabold uppercase leading-tight tracking-wide whitespace-nowrap">
        {kind === 'in' ? 'You’re in' : `Waitlist #${place ?? '–'}`}
      </span>
    </span>
  );
}

/**
 * Home's one bold thing: the next game as a matchday ticket. The dark half is the fixture
 * (date, kick-off, where); the chalk half is your part (spots, paid, your answer). Saying
 * "I'm in" stamps it.
 */
export function MatchdayTicket({ game, onChange }: { game: UpcomingGame; onChange: () => Promise<unknown> }) {
  const { busy, landed, reply } = useRsvp(game, onChange);
  const [confirmOut, setConfirmOut] = useState(false);
  // TODO(api): `location` only comes back on GET /me/games/:id. Adding it to the /me game card would save this call.
  const [location, setLocation] = useState<string | null>(null);
  // "I'm in" / "Can't make it" disappear once answered; keep keyboard focus on the ticket instead of losing it.
  const yourPart = useRef<HTMLDivElement>(null);
  const answered = useRef(game.myStatus);
  useEffect(() => {
    if (answered.current === game.myStatus) return;
    answered.current = game.myStatus;
    const active = document.activeElement;
    if (!active || active === document.body) yourPart.current?.focus({ preventScroll: true });
  }, [game.myStatus]);

  useEffect(() => {
    let live = true;
    getPlayerGame(game.id)
      .then((g) => live && setLocation(g.location))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [game.id]);

  const date = shortDate(game.date);
  const when = daysUntil(game.date);
  const time = prettyTime(game.kickoffTime);
  const full = isFull(game);
  const pct = Math.min(100, Math.round((game.confirmed / Math.max(game.capacity, 1)) * 100));
  const started = kickoffPassed(game);
  const stamped = game.myStatus === 'in' || game.myStatus === 'waitlist' ? game.myStatus : null;
  const place = game.waitlistPosition;
  const ordinal = place === 1 ? '1st' : place === 2 ? '2nd' : place === 3 ? '3rd' : place ? `${place}th` : null;

  return (
    <div id="ticket" className="scroll-mt-24 [filter:drop-shadow(3px_3px_0_var(--color-ink))]">
      {/* Top half: the fixture */}
      <div className="relative rounded-t-[28px] bg-ink text-white overflow-hidden" style={notchBottom}>
        <div className="absolute inset-0 turf-stripes" aria-hidden />
        <div className="relative px-5 pt-5 pb-8">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-white/70 truncate">{game.groupName}</p>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-extrabold ${
                when === 'Today' ? 'bg-volt-400 text-ink' : 'bg-white/10 text-white'
              }`}
            >
              {when === 'Today' ? 'Match day' : when}
            </span>
          </div>
          <p className="mt-2 font-display text-[44px] leading-[0.95] font-extrabold tracking-tight text-volt-300">{date}</p>
          {time && <p className="mt-2 font-display text-xl font-extrabold">Kick-off {time}</p>}
          {location && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`}
              target="_blank"
              rel="noreferrer"
              className="mt-1 -ml-1 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-1 text-sm text-white/80 hover:text-white"
            >
              <svg className="w-4 h-4 shrink-0 text-volt-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
              </svg>
              <span className="truncate">{location}</span>
              <span className="shrink-0 font-bold text-volt-300">
                Map <span aria-hidden>›</span>
              </span>
            </a>
          )}
        </div>
      </div>

      {/* Bottom half: your part. The stamp sits outside the masked box so it can overlap the tear line. */}
      <div className="relative">
      {stamped && (
        <div className="absolute right-4 -top-6 z-10" key={`${stamped}-${landed ?? ''}`}>
          <Stamp kind={stamped} place={place} fresh={landed === stamped} />
        </div>
      )}
      <div ref={yourPart} tabIndex={-1} className="relative rounded-b-[28px] bg-chalk outline-none" style={notchTop}>
        <div className="absolute left-4 right-4 top-0 border-t-2 border-dashed border-ink/25" aria-hidden />
        <p className="sr-only" aria-live="polite">
          {landed === 'in' ? `You’re in for ${date}.` : landed === 'waitlist' ? `You’re number ${place} on the waitlist for ${date}.` : ''}
        </p>

        <div className="px-5 pt-5 pb-5">
          {game.requireRsvp && (
            <div className={stamped ? 'pr-36' : ''}>
              <p className="text-sm font-bold text-ink tabular-nums">
                {full ? 'Full' : `${game.confirmed} of ${game.capacity} in`}
                {game.waitlist > 0 && <span className="font-semibold text-gray-600"> · {game.waitlist} waiting</span>}
              </p>
              <div className="mt-2 h-1.5 rounded-full bg-ink/10" aria-hidden>
                <div className={`h-1.5 rounded-full ${full ? 'bg-kit-500' : 'bg-pitch-500'}`} style={{ width: `${Math.max(pct, 2)}%` }} />
              </div>
            </div>
          )}

          {game.myStatus === 'in' && game.payment && (
            <div className="mt-3">
              {game.payment.status === 'pending' ? (
                <Link
                  href="/me/pay"
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-sun-400 border-2 border-ink px-4 text-sm font-extrabold text-ink"
                >
                  {formatCurrency(game.payment.amount)} to pay <span aria-hidden>›</span>
                </Link>
              ) : (
                <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-volt-400 px-3.5 text-sm font-extrabold text-ink">
                  {game.payment.status === 'paid' ? 'Paid ✓' : 'Covered ✓'}
                </span>
              )}
            </div>
          )}

          {game.myStatus === 'waitlist' && (
            <p className="mt-3 text-sm text-gray-700 leading-snug">
              {ordinal ? `You’re ${ordinal} in line. ` : ''}If someone drops out you’re in automatically and we’ll let you know. You only pay
              once you’re in.
            </p>
          )}

          {game.myStatus === 'out' && <p className="mt-3 text-sm text-gray-600">You said you can’t make it. Changed your mind?</p>}

          {game.bibsOpen && game.myStatus === 'in' && <TicketBibs sessionId={game.id} onPicked={onChange} />}

          {stamped ? (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link
                href={`/me/games/${game.id}`}
                className={`${started ? 'col-span-2' : ''} min-h-12 flex items-center justify-center rounded-xl bg-white border-2 border-ink text-sm font-bold text-ink hover:bg-volt-100`}
              >
                See who’s playing
              </Link>
              {!started && (
                <button
                  onClick={() => setConfirmOut(true)}
                  disabled={!!busy}
                  className="min-h-12 flex items-center justify-center gap-2 rounded-xl text-sm font-bold text-gray-700 hover:text-ink hover:bg-white disabled:opacity-50"
                >
                  {busy === 'out' && <BallSpinner />}
                  {game.myStatus === 'waitlist' ? 'Leave waitlist' : 'Drop out'}
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="mt-4 grid grid-cols-[1.5fr_1fr] gap-2">
                <button
                  onClick={() => reply('in')}
                  disabled={!!busy}
                  className="min-h-[52px] flex items-center justify-center gap-2 rounded-xl bg-ink text-base font-extrabold text-volt-300 hover:bg-pitch-900 active:scale-[0.98] transition-transform disabled:opacity-60"
                >
                  {busy === 'in' && <BallSpinner />}
                  {full ? 'Join waitlist' : 'I’m in'}
                </button>
                <button
                  onClick={() => reply('out')}
                  disabled={!!busy || game.myStatus === 'out'}
                  className="min-h-[52px] flex items-center justify-center gap-2 rounded-xl bg-white border-2 border-gray-200 text-sm font-bold text-gray-700 hover:border-ink disabled:opacity-50"
                >
                  {busy === 'out' && <BallSpinner />}
                  Can’t make it
                </button>
              </div>
              <Link
                href={`/me/games/${game.id}`}
                className="mt-1 flex min-h-11 items-center justify-center text-sm font-bold text-pitch-700 hover:text-ink"
              >
                See who’s playing&nbsp;<span aria-hidden>›</span>
              </Link>
            </>
          )}
        </div>
      </div>
      </div>

      <ConfirmDialog
        open={confirmOut}
        variant="danger"
        title={game.myStatus === 'waitlist' ? `Leave the waitlist for ${date}?` : `Drop out of ${date}?`}
        message={
          game.myStatus === 'waitlist'
            ? `You’ll lose your place${ordinal ? ` (${ordinal} in line)` : ''}.`
            : 'Your spot goes to the next person waiting.'
        }
        confirmLabel={game.myStatus === 'waitlist' ? 'Leave waitlist' : 'Drop out'}
        onCancel={() => setConfirmOut(false)}
        onConfirm={() => {
          setConfirmOut(false);
          reply('out');
        }}
      />
    </div>
  );
}
