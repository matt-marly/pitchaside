'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { EmptyState } from '@/components/empty-state';
import { ErrorView } from '@/components/error-view';
import { Section } from '@/components/player-ui';
import { ComingUpRow } from '@/components/player-home/coming-up-row';
import { MatchdayTicket } from '@/components/player-home/matchday-ticket';
import { PlayerStrip } from '@/components/player-home/player-strip';
import { InstallChip, PushChip } from '@/components/player-home/prompt-chips';
import { StatusBanner, pickBanner } from '@/components/player-home/status-banner';
import { TableChip } from '@/components/player-home/table-sheet';
import { formatCurrency } from '@/lib/api';
import { getPlayerHome, type PlayerHome } from '@/lib/player';

/**
 * Player Home, top to bottom: who you are (slim), the one thing that needs you, your next game
 * as a matchday ticket, the games after it, then the quieter bits (prompts, money, the table).
 */
export default function PlayerHomePage() {
  const [home, setHome] = useState<PlayerHome | null>(null);
  // First load failed: say so instead of a skeleton that never ends.
  const [failed, setFailed] = useState(false);
  const load = useCallback(
    () =>
      getPlayerHome()
        .then((h) => {
          setHome(h);
          setFailed(false);
        })
        .catch(() => setFailed(true)),
    [],
  );

  useEffect(() => {
    load();
  }, [load]);

  if (!home && failed) {
    return (
      <ErrorView
        fullScreen={false}
        eyebrow="No signal"
        title="Couldn’t load your games"
        message="Check your connection and try again."
        onRetry={load}
        homeHref="/me/games"
        homeLabel="See all games"
      />
    );
  }

  if (!home) {
    return (
      <div className="space-y-4 animate-pulse" aria-busy="true">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gray-100" />
          <div className="h-6 w-32 rounded-lg bg-gray-100" />
        </div>
        <div className="h-[60px] bg-gray-100 rounded-2xl" />
        <div className="h-80 bg-gray-100 rounded-[28px]" />
      </div>
    );
  }

  const r = home.ratings;
  const firstTable = home.tables.find((t) => t.me);
  const caption =
    [
      firstTable?.me ? `#${firstTable.me.rank} in ${firstTable.groupName}` : null,
      r.record.w + r.record.d + r.record.l ? `W${r.record.w} D${r.record.d} L${r.record.l}` : null,
      r.potmWins ? `★ ${r.potmWins} POTM` : null,
    ]
      .filter(Boolean)
      .join(' · ') || (home.groups[0]?.name ?? 'Your card builds as you play');
  const totalOwed = home.owed.reduce((sum, o) => sum + o.amount, 0);
  const banner = pickBanner(home);
  const [next, ...later] = home.upcoming;

  const toPay = banner?.kind !== 'pay' && (
    <Link
      href="/me/pay"
      className={`flex min-h-[52px] items-center justify-between gap-3 rounded-2xl px-4 ${
        totalOwed > 0 ? 'bg-ink text-white' : 'bg-volt-100 border border-volt-300 text-ink'
      }`}
    >
      <span className="text-sm font-bold">
        {totalOwed > 0 ? (
          <>
            To pay <span className="font-display text-lg font-extrabold tabular-nums ml-1">{formatCurrency(totalOwed)}</span>
          </>
        ) : (
          'All square ✅'
        )}
      </span>
      <span className={`text-sm font-bold ${totalOwed > 0 ? 'text-volt-300' : 'text-ink'}`}>
        {totalOwed > 0 ? `${home.owed.length} item${home.owed.length === 1 ? '' : 's'}` : 'History'} <span aria-hidden>›</span>
      </span>
    </Link>
  );

  return (
    <div className="md:grid md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] md:gap-8 md:items-start">
      <div>
        <PlayerStrip firstName={home.player.firstName} lastName={home.player.lastName} ratings={r} caption={caption} />
        <StatusBanner banner={banner} />

        <div className="mt-5">
          {next ? (
            <MatchdayTicket key={next.id} game={next} onChange={load} />
          ) : home.groups.length ? (
            <EmptyState icon="calendar" title="No games yet" description="We’ll ping you when your organiser adds the next one." />
          ) : (
            <EmptyState
              icon="users"
              title="You’re not in a group yet"
              description="Open the group link your organiser shares on WhatsApp, and your games will show up here."
            />
          )}
        </div>

        {later.length > 0 ? (
          <Section
            title="Also coming up"
            action={
              <Link href="/me/games" className="inline-flex min-h-11 items-center px-1 text-sm font-bold text-pitch-700 hover:text-ink">
                All games&nbsp;<span aria-hidden>›</span>
              </Link>
            }
          >
            <div className="space-y-2">
              {later.map((g) => (
                <ComingUpRow key={g.id} game={g} onChange={load} />
              ))}
            </div>
          </Section>
        ) : (
          next && (
            <Link href="/me/games" className="mt-3 flex min-h-11 items-center justify-center text-sm font-bold text-pitch-700 hover:text-ink">
              All games&nbsp;<span aria-hidden>›</span>
            </Link>
          )
        )}
      </div>

      <div className="mt-7 md:mt-0 space-y-2">
        <PushChip />
        <InstallChip />
        {toPay}
        <TableChip tables={home.tables} myName={`${home.player.firstName} ${home.player.lastName}`} />
      </div>
    </div>
  );
}
