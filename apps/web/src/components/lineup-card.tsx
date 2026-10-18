'use client';

import { MatchDayBoard } from '@/components/match-day/board';

// Bib colours and team names live with the match-day board; players' screens import them from here.
export { TEAMS, teamName } from '@/components/match-day/kit';

/**
 * Match day: split the squad into 2–6 coloured sides — each can have a captain it's named after —
 * record each short game, crown the Team of the Day. Now the 3-step board in components/match-day.
 * `matchDay`: the game is today or has been played.
 */
export function LineupCard({ sessionId, matchDay = false }: { sessionId: string; matchDay?: boolean }) {
  return <MatchDayBoard sessionId={sessionId} matchDay={matchDay} />;
}
