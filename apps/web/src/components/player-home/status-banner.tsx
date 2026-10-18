'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/api';
import type { PlayerHome } from '@/lib/player';
import { shortDate } from './use-rsvp';

type Banner =
  | { kind: 'vote'; href: string; title: string; detail: string }
  | { kind: 'pay'; href: string; title: string; detail: string }
  | { kind: 'bib'; href: string; title: string; detail: string };

/** The single most urgent thing, in this order: a vote waiting, money to pay, picking your bib. */
export function pickBanner(home: PlayerHome): Banner | null {
  const votes = home.openVotes.filter((v) => !v.voted);
  if (votes.length) {
    const v = votes[0];
    return {
      kind: 'vote',
      // More than one: Games lists every finished game with its vote.
      href: votes.length > 1 ? '/me/games' : `/v/${v.token}`,
      title: votes.length > 1 ? `${votes.length} votes waiting` : 'Vote for the stars',
      detail: `${shortDate(v.date)}${v.groupName ? ` · ${v.groupName}` : ''}`,
    };
  }

  const owed = home.owed.reduce((sum, o) => sum + o.amount, 0);
  if (owed > 0) {
    const first = home.owed[0];
    return {
      kind: 'pay',
      href: '/me/pay',
      title: `${formatCurrency(owed)} to pay`,
      detail: home.owed.length > 1 ? `For ${home.owed.length} games · ${first.groupName}` : `For ${first.label ?? `the ${shortDate(first.date)} game`}`,
    };
  }

  const bibGame = home.upcoming.find((g) => g.bibsOpen && g.myStatus === 'in' && !g.myTeam);
  if (bibGame) {
    return { kind: 'bib', href: '#ticket', title: 'Pick your bib', detail: 'Tap your colour on today’s ticket' };
  }
  return null;
}

const look = {
  vote: { box: 'bg-sun-400 text-ink border-2 border-ink', icon: 'bg-ink text-sun-400', sub: 'text-ink/70', glyph: '★' },
  pay: { box: 'bg-ink text-white', icon: 'bg-volt-400 text-ink', sub: 'text-white/70', glyph: '₦' },
  bib: { box: 'bg-volt-300 text-ink border-2 border-ink', icon: 'bg-ink text-volt-300', sub: 'text-ink/70', glyph: '👕' },
} as const;

/** A slim banner above the ticket. When what it says changes (say, after "I'm in"), it slides in afresh. */
export function StatusBanner({ banner }: { banner: Banner | null }) {
  const shown = useRef<string | null>(null);
  const key = banner ? `${banner.kind}:${banner.title}` : null;
  const changed = shown.current !== null && shown.current !== key;
  useEffect(() => {
    shown.current = key ?? '';
  }, [key]);

  if (!banner) return null;
  const l = look[banner.kind];
  return (
    <Link
      key={key}
      href={banner.href}
      className={`mt-4 flex min-h-[60px] items-center gap-3 rounded-2xl px-3.5 py-2.5 ${l.box} ${changed ? 'animate-land' : ''}`}
    >
      <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-display text-lg font-extrabold ${l.icon}`} aria-hidden>
        {l.glyph}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-lg font-extrabold leading-tight tabular-nums">{banner.title}</span>
        <span className={`block text-xs font-semibold truncate ${l.sub}`}>{banner.detail}</span>
      </span>
      <span className="text-lg font-bold shrink-0" aria-hidden>
        ›
      </span>
    </Link>
  );
}
