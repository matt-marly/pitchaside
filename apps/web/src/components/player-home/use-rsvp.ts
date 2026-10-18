'use client';

import { useState } from 'react';
import { buzz } from '@/components/motion';
import { useToast } from '@/components/toast';
import { setRsvp, type UpcomingGame } from '@/lib/player';

/** "Sat 31 Oct": built by hand so every browser drops the comma some add after the weekday. */
export function shortDate(iso: string) {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return `${d.toLocaleDateString('en-GB', { weekday: 'short' })} ${d.getDate()} ${d.toLocaleDateString('en-GB', { month: 'short' })}`;
}

/** Kick-off has been and gone: no more dropping out. Without a kick-off time, the day itself counts. */
export function kickoffPassed(game: Pick<UpcomingGame, 'date' | 'kickoffTime'>) {
  const day = game.date.slice(0, 10);
  const at = new Date(`${day}T${game.kickoffTime ?? '23:59'}:00`).getTime();
  return Date.now() >= at;
}

export function isFull(game: UpcomingGame) {
  return game.requireRsvp && game.confirmed >= game.capacity;
}

/**
 * Saying "I'm in" or "Can't make it" from Home. `landed` is what just came back ("in" or "waitlist"),
 * so the ticket can stamp it — only after a tap, never on page load.
 */
export function useRsvp(game: UpcomingGame, onChange: () => Promise<unknown>) {
  const toast = useToast();
  const [busy, setBusy] = useState<'in' | 'out' | null>(null);
  const [landed, setLanded] = useState<'in' | 'waitlist' | null>(null);

  async function reply(status: 'in' | 'out') {
    setBusy(status);
    try {
      const res = await setRsvp(game.id, status);
      if (res.status === 'in' || res.status === 'waitlist') {
        buzz(res.status === 'in' ? [12, 40, 20] : 14);
        setLanded(res.status);
      } else {
        setLanded(null);
        toast.success(game.myStatus === 'waitlist' ? 'You’ve left the waitlist' : 'Got it — maybe next time');
      }
      await onChange();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'That didn’t go through. Check your connection and try again.');
    } finally {
      setBusy(null);
    }
  }

  return { busy, landed, reply };
}
