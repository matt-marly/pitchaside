'use client';

import Link from 'next/link';
import { formatCurrency, type ISessionWithDetails } from '@/lib/api';
import { daysFromToday, gameDay, gameMoney } from '@/components/money-card';
import { prettyTime } from '@/components/player-ui';

type Tone = 'live' | 'warn' | 'calm' | 'done' | 'off';
const toneCls: Record<Tone, string> = {
  live: 'bg-volt-300 text-ink',
  warn: 'bg-sun-400/25 text-amber-800',
  calm: 'bg-chalk text-gray-700',
  done: 'bg-ink text-white',
  off: 'bg-kit-500/15 text-kit-600',
};

/**
 * The same short states as the home card: In N days / Tomorrow / Today / Not ended / Voting / Final.
 * Votes stay open for 8 days from the game day (VOTING_WINDOW_DAYS on the server), so an ended
 * game reads "Voting" for that week and "Final" after.
 */
export function gameChip(s: ISessionWithDetails): { text: string; tone: Tone } {
  const days = daysFromToday(s.date);
  if (s.status === 'cancelled') return { text: 'Cancelled', tone: 'off' };
  if (s.kind === 'dues') return s.status === 'completed' ? { text: 'Closed', tone: 'done' } : { text: 'Collecting', tone: 'live' };
  if (s.status === 'completed') return days >= -7 ? { text: 'Voting', tone: 'live' } : { text: 'Final', tone: 'done' };
  if (days < 0) return { text: 'Not ended', tone: 'warn' };
  if (days === 0) return { text: 'Today', tone: 'live' };
  return { text: days === 1 ? 'Tomorrow' : `In ${days} days`, tone: 'calm' };
}

function GameRow({ s, targetPlayers, kickoff }: { s: ISessionWithDetails; targetPlayers: number; kickoff?: string | null }) {
  const chip = gameChip(s);
  const { payments, paid, owing } = gameMoney(s);
  const collected = Number(s.collectedAmount);
  const owed = owing.reduce((sum, p) => sum + Number(p.amount), 0);
  // Before a game the bar runs to the full-squad target; once it's played, to what the players who were in owed.
  const played = s.status === 'completed' || daysFromToday(s.date) < 0;
  const scale = s.kind === 'dues' || played ? collected + owed : Number(s.targetAmount);
  const pct = scale > 0 ? Math.min(100, Math.round((collected / scale) * 100)) : 0;
  const owedPct = scale > 0 ? Math.min(100 - pct, (owed / scale) * 100) : 0;
  const time = s.kind === 'dues' ? null : prettyTime(s.kickoffTime || kickoff);
  const title =
    s.kind === 'dues' && s.label
      ? `${s.label} dues`
      : gameDay(s.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const line =
    s.kind === 'dues'
      ? `${paid.length} of ${payments.length} paid`
      : played
        ? payments.length
          ? `${payments.length} played · ${owing.length ? `${owing.length} still owe` : 'all paid'}`
          : 'Nobody was in'
        : `${payments.length} of ${targetPlayers} in`;
  const money = `${formatCurrency(collected)} paid of ${formatCurrency(played || s.kind === 'dues' ? collected + owed : Number(s.targetAmount))}`;

  return (
    <li>
      <Link
        href={`/sessions/${s.id}`}
        className="press block px-1 py-3.5 rounded-xl hover:bg-chalk transition-colors"
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-[15px] font-bold text-ink">
            {title}
            {time && <span className="font-semibold text-gray-600"> · {time}</span>}
          </p>
          <span className={`inline-flex items-center gap-1.5 text-[11px] font-extrabold px-2.5 py-1 rounded-full whitespace-nowrap ${toneCls[chip.tone]}`}>
            {(chip.tone === 'live' || chip.tone === 'warn') && (
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse-soft ${chip.tone === 'warn' ? 'bg-amber-600' : 'bg-pitch-600'}`} aria-hidden />
            )}
            {chip.text}
          </span>
        </div>
        <div className="mt-2.5 h-2 rounded-full bg-gray-100 overflow-hidden flex" aria-hidden>
          <div className="h-full bg-volt-500" style={{ width: `${pct}%` }} />
          <div className="h-full bg-sun-400" style={{ width: `${owedPct}%` }} />
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-gray-600 tabular-nums">
          <span className="truncate">{line}</span>
          <span className="shrink-0 font-semibold">{money}</span>
        </div>
      </Link>
    </li>
  );
}

/** Coming up (soonest first), then past games (newest first), each linking to the game page. */
export function GamesList({
  sessions,
  targetPlayers,
  kickoff,
}: {
  sessions: ISessionWithDetails[];
  targetPlayers: number;
  kickoff?: string | null;
}) {
  const ahead = sessions
    .filter((s) => s.status === 'upcoming' && daysFromToday(s.date) >= 0)
    .sort((a, b) => gameDay(a.date).getTime() - gameDay(b.date).getTime());
  const past = sessions
    .filter((s) => !ahead.includes(s))
    .sort((a, b) => gameDay(b.date).getTime() - gameDay(a.date).getTime());
  return (
    <div className="space-y-5">
      {[
        { title: 'Coming up', list: ahead },
        { title: 'Played', list: past },
      ]
        .filter((g) => g.list.length)
        .map((g) => (
          <section key={g.title}>
            <h3 className="px-1 mb-2 font-display text-[17px] font-extrabold text-ink">
              {g.title} <span className="text-gray-400 tabular-nums">{g.list.length}</span>
            </h3>
            <ul className="-mx-1 divide-y divide-gray-100">
              {g.list.map((s) => (
                <GameRow key={s.id} s={s} targetPlayers={targetPlayers} kickoff={kickoff} />
              ))}
            </ul>
          </section>
        ))}
    </div>
  );
}
