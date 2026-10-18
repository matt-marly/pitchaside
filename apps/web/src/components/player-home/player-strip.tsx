'use client';

import Link from 'next/link';
import { Avatar } from '@/components/ratings';
import type { PlayerRatings } from '@/lib/api';

/**
 * Home's slim header: who you are and your OVR. The full trading card lives on Me;
 * the chip takes you there.
 */
export function PlayerStrip({
  firstName,
  lastName,
  ratings,
  caption,
}: {
  firstName: string;
  lastName: string;
  ratings: PlayerRatings;
  caption: string;
}) {
  const ovr = ratings.ovr ?? '–';
  return (
    <div className="flex items-center gap-3">
      <Avatar name={`${firstName} ${lastName}`} className="w-12 h-12 text-base" />
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-2xl font-extrabold leading-tight text-ink truncate">Hi {firstName}</h1>
        <p className="text-xs font-semibold text-gray-600 truncate">{caption}</p>
      </div>
      <Link
        href="/me/profile"
        className="shrink-0 flex min-h-11 items-center gap-1.5 rounded-full bg-ink pl-1.5 pr-3 text-white hover:bg-pitch-900"
      >
        <span className="min-w-8 h-8 px-1.5 rounded-full bg-volt-400 text-ink font-display text-base font-extrabold tabular-nums flex items-center justify-center">
          {ovr}
        </span>{' '}
        <span className="text-xs font-bold">{ratings.provisional ? 'New' : 'OVR'}</span>
        {/* Read as "70 New, your player card": what's on screen first, so voice control can say it. */}
        <span className="sr-only">, your player card</span>
        <span className="text-volt-300" aria-hidden>
          ›
        </span>
      </Link>
    </div>
  );
}
