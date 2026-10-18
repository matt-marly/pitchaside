'use client';

import { useCallback, useEffect, useState } from 'react';
import { TEAMS, teamName } from '@/components/lineup-card';
import { MatchDayBibs } from '@/components/match-day-bibs';
import { buzz } from '@/components/motion';
import { Sheet } from '@/components/sheet';
import { BallSpinner } from '@/components/skeleton';
import { useToast } from '@/components/toast';
import type { TeamKey } from '@/lib/api';
import { getGameLineup, pickBib, type GameLineup } from '@/lib/player';

const KEYS = Object.keys(TEAMS) as TeamKey[];

/**
 * Match day on the ticket: the bib chips stay inline, the team lists fold into a sheet
 * ("See teams · Orange 5 · Yellow 4"). The sheet shows the full MatchDayBibs panel, so who's in
 * which team and who's paid still live in one place.
 */
export function TicketBibs({ sessionId, onPicked }: { sessionId: string; onPicked: () => Promise<unknown> }) {
  const toast = useToast();
  const [lineup, setLineup] = useState<GameLineup | null>(null);
  const [saving, setSaving] = useState<TeamKey | 'clear' | null>(null);
  const [justPicked, setJustPicked] = useState<TeamKey | null>(null);
  const [teamsOpen, setTeamsOpen] = useState(false);

  const load = useCallback(() => getGameLineup(sessionId).then(setLineup).catch(() => setLineup(null)), [sessionId]);
  useEffect(() => {
    load();
  }, [load]);

  if (!lineup) return null;
  const teams = KEYS.slice(0, lineup.teamCount);
  const count = (t: TeamKey) => lineup.squad.filter((p) => p.team === t).length;
  const hasCaptains = Object.keys(lineup.captains).length > 0;

  async function choose(team: TeamKey) {
    const next = lineup?.myTeam === team ? null : team;
    setSaving(next ?? 'clear');
    try {
      setLineup(await pickBib(sessionId, next));
      setJustPicked(next);
      if (next) buzz();
      await onPicked();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Couldn’t save your team. Try again.');
    } finally {
      setSaving(null);
    }
  }

  function closeTeams() {
    setTeamsOpen(false);
    // The sheet can change your team too, so catch up.
    load();
    onPicked();
  }

  return (
    <div className="mt-4">
      {lineup.bibsOpen ? (
        <>
          <p className="text-sm font-bold text-ink mb-2">{hasCaptains ? 'Which team are you in?' : 'Which bib are you in?'}</p>
          <div className="flex flex-wrap gap-2">
            {teams.map((t) => {
              const mine = lineup.myTeam === t;
              return (
                <button
                  key={t}
                  onClick={() => choose(t)}
                  disabled={!!saving}
                  aria-pressed={mine}
                  className={`min-h-11 flex items-center gap-2 pl-2 pr-4 rounded-full text-sm font-bold transition-colors disabled:opacity-60 ${
                    mine ? 'bg-ink text-white' : 'bg-white text-ink border-2 border-gray-200 hover:border-ink'
                  }`}
                >
                  {saving === t ? (
                    <BallSpinner />
                  ) : (
                    <span
                      className={`w-6 h-6 rounded-full ${TEAMS[t].swatch} ${mine && justPicked === t ? 'animate-kit-on' : ''}`}
                      aria-hidden
                    />
                  )}
                  {teamName(t, lineup.captains)}
                  {mine && <span aria-hidden>✓</span>}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <p className="text-sm text-gray-600">
          {lineup.bibsClosed ? 'Teams are locked — it’s been a week since this game.' : 'Picking your team opens on match day.'}
        </p>
      )}

      <button
        onClick={() => setTeamsOpen(true)}
        className="mt-2 w-full min-h-11 flex items-center justify-between gap-2 rounded-xl px-1 text-sm font-bold text-pitch-700 hover:text-ink"
      >
        <span className="flex items-center gap-2 min-w-0">
          See teams
          <span className="flex items-center gap-2 text-xs font-semibold text-gray-600 truncate">
            {teams.map((t) => (
              <span key={t} className="inline-flex items-center gap-1">
                <span className={`w-2.5 h-2.5 rounded-sm ${TEAMS[t].swatch}`} aria-hidden />
                {teamName(t, lineup.captains)} {count(t)}
              </span>
            ))}
          </span>
        </span>
        <span aria-hidden>›</span>
      </button>

      {teamsOpen && (
        <Sheet
          titleId="ticket-teams"
          align="left"
          onClose={closeTeams}
        >
          <h2 id="ticket-teams" className="font-display text-xl font-extrabold text-ink">
            Today’s teams
          </h2>
          <MatchDayBibs sessionId={sessionId} />
          <button
            onClick={closeTeams}
            className="mt-4 w-full min-h-12 rounded-xl bg-gray-100 text-sm font-bold text-gray-700 hover:bg-gray-200"
          >
            Done
          </button>
        </Sheet>
      )}
    </div>
  );
}
