'use client';

import { useEffect, useRef, useState } from 'react';
import { buzz } from '@/components/motion';
import { Sheet } from '@/components/sheet';
import { BallSpinner } from '@/components/skeleton';
import { Trophy } from '@/components/illustrations';
import { useToast } from '@/components/toast';
import type { Lineup, MatchGame, TeamKey } from '@/lib/api';
import type { LineupActions } from './board';
import { Shirt, TEAMS, TEAM_KEYS, teamName } from './kit';

type Draft = { teamA: TeamKey; teamB: TeamKey; scoreA: number; scoreB: number };

/**
 * Who plays next: the winner stays on and the side that has waited longest comes on. With two
 * sides it's the same pair again; after a draw, the two who've waited longest.
 */
function nextPair(games: Pick<MatchGame, 'teamA' | 'teamB' | 'scoreA' | 'scoreB'>[], teams: TeamKey[]): [TeamKey, TeamKey] {
  const last = games[games.length - 1];
  if (!last || teams.length === 2 || !teams.includes(last.teamA) || !teams.includes(last.teamB)) return [teams[0], teams[1]];
  const lastPlayed = (t: TeamKey) => {
    for (let i = games.length - 1; i >= 0; i--) if (games[i].teamA === t || games[i].teamB === t) return i;
    return -1;
  };
  const waiting = teams.filter((t) => t !== last.teamA && t !== last.teamB).sort((a, b) => lastPlayed(a) - lastPlayed(b));
  const winner = last.scoreA > last.scoreB ? last.teamA : last.scoreB > last.scoreA ? last.teamB : null;
  if (winner) return [winner, waiting[0]];
  return waiting.length >= 2 ? [waiting[0], waiting[1]] : [last.teamB, waiting[0]];
}

/** A goal stepper: 48px − and + around a digit that flips when it changes. */
function Goals({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="h-16 flex items-center overflow-hidden" aria-live="polite" aria-label={`${label}: ${value}`}>
        <span key={value} className="font-display text-6xl font-extrabold text-white tabular-nums leading-none animate-flip-in">
          {value}
        </span>
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          disabled={value === 0}
          className="w-12 h-12 rounded-full bg-white/10 text-white text-2xl font-bold leading-none hover:bg-white/20 disabled:opacity-30 active:scale-95 transition"
          aria-label={`${label}: one goal fewer`}
        >
          −
        </button>
        <button
          onClick={() => {
            buzz(10);
            onChange(Math.min(99, value + 1));
          }}
          className="w-12 h-12 rounded-full bg-volt-400 text-ink text-2xl font-bold leading-none hover:bg-volt-300 active:scale-95 transition"
          aria-label={`${label}: one more goal`}
        >
          +
        </button>
      </div>
    </div>
  );
}

function TeamChoice({
  legend,
  teams,
  captains,
  value,
  other,
  onChange,
}: {
  legend: string;
  teams: TeamKey[];
  captains: Lineup['captains'];
  value: TeamKey;
  other: TeamKey;
  onChange: (t: TeamKey) => void;
}) {
  return (
    <fieldset>
      <legend className="text-xs font-bold text-gray-600 mb-1.5">{legend}</legend>
      <div className="flex flex-wrap gap-1.5" role="radiogroup">
        {teams.map((t) => {
          const on = value === t;
          return (
            <button
              key={t}
              role="radio"
              aria-checked={on}
              onClick={() => onChange(t)}
              disabled={t === other}
              className={`min-h-11 flex items-center gap-1.5 pl-1.5 pr-3 rounded-xl text-sm font-bold transition-colors disabled:opacity-35 ${
                on ? 'bg-ink text-white' : 'bg-chalk text-ink hover:bg-gray-100'
              }`}
            >
              <Shirt team={t} className="w-7 h-7" onDark={on} />
              <span className="max-w-[9rem] truncate">{teamName(t, captains)}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** "+ Add result" sheet: pick the two teams by name, set the score, save (and go again). */
function ResultSheet({ lineup, actions, onClose }: { lineup: Lineup; actions: LineupActions; onClose: () => void }) {
  const toast = useToast();
  const teams = TEAM_KEYS.slice(0, lineup.teamCount);
  const [a, b] = nextPair(lineup.games, teams);
  const [draft, setDraft] = useState<Draft>({ teamA: a, teamB: b, scoreA: 0, scoreB: 0 });
  const [saving, setSaving] = useState<'again' | 'close' | null>(null);
  const suggested = lineup.games.length > 0 && teams.length > 2;

  async function save(again: boolean) {
    setSaving(again ? 'again' : 'close');
    const ok = await actions.addGame(draft);
    setSaving(null);
    if (!ok) return;
    buzz([10, 50, 10]);
    toast.success(`Saved: ${teamName(draft.teamA, lineup.captains)} ${draft.scoreA}–${draft.scoreB} ${teamName(draft.teamB, lineup.captains)}`);
    if (!again) return onClose();
    const [na, nb] = nextPair([...lineup.games, draft], teams);
    setDraft({ teamA: na, teamB: nb, scoreA: 0, scoreB: 0 });
  }

  const nameA = teamName(draft.teamA, lineup.captains);
  const nameB = teamName(draft.teamB, lineup.captains);
  const side = (t: TeamKey, name: string, value: number, onChange: (v: number) => void) => (
    <div className="min-w-0 flex flex-col items-center gap-2">
      <span className={`max-w-full truncate text-xs font-extrabold px-2.5 py-1 rounded-lg ${TEAMS[t].swatch} ${TEAMS[t].text}`}>{name}</span>
      <Goals label={name} value={value} onChange={onChange} />
    </div>
  );

  return (
    <Sheet titleId="add-result" onClose={onClose} align="left">
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <h2 id="add-result" className="font-display text-xl font-extrabold text-ink">
          Add result
        </h2>
        <span key={lineup.games.length} className="text-xs font-bold text-gray-500 tabular-nums animate-flip-in">
          Result {lineup.games.length + 1}
        </span>
      </div>

      <div className="space-y-3">
        <TeamChoice legend="Home" teams={teams} captains={lineup.captains} value={draft.teamA} other={draft.teamB} onChange={(t) => setDraft({ ...draft, teamA: t })} />
        <TeamChoice legend="Away" teams={teams} captains={lineup.captains} value={draft.teamB} other={draft.teamA} onChange={(t) => setDraft({ ...draft, teamB: t })} />
        {suggested && <p className="text-[11px] text-gray-500">Picked for you: winner stays on, longest-waiting team comes on.</p>}
      </div>

      {/* The scorebug */}
      <div className="mt-4 rounded-3xl bg-ink turf-stripes p-4">
        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
          {side(draft.teamA, nameA, draft.scoreA, (v) => setDraft({ ...draft, scoreA: v }))}
          <span className="font-display text-3xl font-extrabold text-white/30 mt-12" aria-hidden>
            –
          </span>
          {side(draft.teamB, nameB, draft.scoreB, (v) => setDraft({ ...draft, scoreB: v }))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-[3fr_2fr] gap-2">
        <button
          onClick={() => save(true)}
          disabled={!!saving || draft.teamA === draft.teamB}
          className="min-h-12 px-2 rounded-xl text-[13px] font-bold whitespace-nowrap text-ink bg-white border-2 border-ink hover:bg-chalk disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          {saving === 'again' && <BallSpinner />}
          Save &amp; add another
        </button>
        <button
          onClick={() => save(false)}
          disabled={!!saving || draft.teamA === draft.teamB}
          className="min-h-12 px-2 rounded-xl text-sm font-extrabold text-volt-300 bg-ink hover:bg-pitch-900 disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          {saving === 'close' && <BallSpinner />}
          Save
        </button>
      </div>
    </Sheet>
  );
}

/**
 * Step 3, the scorebug: today's table and Team of the Day first, then every result, with a sticky
 * "+ Add result" that opens the score sheet.
 */
export function ResultsStep({ lineup, actions, matchDay }: { lineup: Lineup; actions: LineupActions; matchDay: boolean }) {
  const [adding, setAdding] = useState(false);
  const [fresh, setFresh] = useState<string | null>(null);
  const seen = useRef(lineup.games.length);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
  }, []);
  // Mark the result that just came in.
  useEffect(() => {
    if (lineup.games.length > seen.current) setFresh(lineup.games[lineup.games.length - 1].id);
    seen.current = lineup.games.length;
  }, [lineup.games]);

  const top = lineup.teamOfTheDay ? lineup.standings.find((r) => r.team === lineup.teamOfTheDay) : null;
  const played = lineup.games.length > 0;
  const flipCls = mounted.current ? 'inline-block animate-flip-in' : 'inline-block';

  return (
    <div>
      {/* Team of the Day */}
      {played && (
        <section className="relative rounded-3xl bg-ink turf-stripes text-white overflow-hidden mb-3 p-4 pr-28 min-h-[112px]" aria-live="polite">
          <Trophy className="absolute -right-2 -bottom-3 w-32 h-auto opacity-95" />
          {top ? (
            <>
              <p className="text-xs font-bold text-volt-300">Team of the Day</p>
              <div key={top.team} className={`flex items-center gap-2 mt-1 ${mounted.current ? 'animate-land' : ''}`}>
                <Shirt team={top.team} className="w-9 h-9 shrink-0" onDark />
                <span className="font-display text-2xl font-extrabold leading-tight truncate">{teamName(top.team, lineup.captains)}</span>
              </div>
              <p className="mt-1 text-xs text-white/70 tabular-nums">
                {top.pts} pts · {top.w}W {top.d}D {top.l}L
              </p>
            </>
          ) : (
            <>
              <p className="text-xs font-bold text-volt-300">Team of the Day</p>
              <p className="font-display text-xl font-extrabold leading-tight mt-1">Level at the top</p>
              <p className="mt-1 text-xs text-white/70">The next result decides it.</p>
            </>
          )}
        </section>
      )}

      {/* Today's table */}
      {played && (
        <section className="rounded-3xl bg-white border border-gray-100 shadow-card overflow-hidden mb-5" aria-label="Today's table">
          <div className="grid grid-cols-[1fr_repeat(4,22px)_30px_30px] gap-1 px-3 py-2 bg-chalk text-[11px] font-bold text-gray-500">
            <span>Today</span>
            <span className="text-center">P</span>
            <span className="text-center">W</span>
            <span className="text-center">D</span>
            <span className="text-center">L</span>
            <span className="text-center">GD</span>
            <span className="text-right">Pts</span>
          </div>
          {lineup.standings.map((r) => {
            const gd = r.gf - r.ga;
            return (
              <div
                key={r.team}
                className={`grid grid-cols-[1fr_repeat(4,22px)_30px_30px] gap-1 items-center px-3 min-h-12 border-t border-gray-100 text-sm ${
                  lineup.teamOfTheDay === r.team ? 'bg-volt-100' : ''
                }`}
              >
                <span className="flex items-center gap-2 min-w-0 font-bold text-ink">
                  <Shirt team={r.team} className="w-6 h-6 shrink-0" />
                  <span className="truncate">{teamName(r.team, lineup.captains)}</span>
                </span>
                {[r.p, r.w, r.d, r.l].map((v, i) => (
                  <span key={i} className="text-center text-gray-600 tabular-nums">
                    <span key={v} className={flipCls}>{v}</span>
                  </span>
                ))}
                <span className="text-center text-gray-600 tabular-nums">{gd > 0 ? `+${gd}` : gd}</span>
                <span className="text-right font-display text-base font-extrabold text-ink tabular-nums">
                  <span key={r.pts} className={flipCls}>{r.pts}</span>
                </span>
              </div>
            );
          })}
        </section>
      )}

      {/* Results */}
      {played ? (
        <section aria-label="Results">
          <h3 className="px-1 mb-1.5 text-xs font-bold text-gray-600">
            <span className="tabular-nums">{lineup.games.length}</span> result{lineup.games.length === 1 ? '' : 's'}
          </h3>
          <ol className="space-y-1.5">
            {lineup.games.map((g, i) => (
              <li
                key={g.id}
                className={`flex items-center gap-2 rounded-2xl bg-white border border-gray-100 pl-3 min-h-14 ${fresh === g.id ? 'animate-glow' : ''}`}
              >
                <span className="text-[11px] font-bold text-gray-500 w-4 tabular-nums">{i + 1}</span>
                <span className="flex-1 min-w-0 flex items-center justify-end gap-1.5 text-sm font-bold text-ink">
                  <span className="truncate">{teamName(g.teamA, lineup.captains)}</span>
                  <Shirt team={g.teamA} className="w-6 h-6 shrink-0" />
                </span>
                <span className="font-display text-lg font-extrabold text-ink tabular-nums px-1 shrink-0">
                  {g.scoreA}–{g.scoreB}
                </span>
                <span className="flex-1 min-w-0 flex items-center gap-1.5 text-sm font-bold text-ink">
                  <Shirt team={g.teamB} className="w-6 h-6 shrink-0" />
                  <span className="truncate">{teamName(g.teamB, lineup.captains)}</span>
                </span>
                <button
                  onClick={() => actions.deleteGame(g.id)}
                  disabled={!!actions.busy}
                  className="w-11 h-11 shrink-0 flex items-center justify-center text-gray-500 hover:text-kit-600 rounded-xl"
                  aria-label={`Delete result ${i + 1}`}
                >
                  {actions.busy === `del-${g.id}` ? (
                    <BallSpinner />
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  )}
                </button>
              </li>
            ))}
          </ol>
        </section>
      ) : (
        <section className="rounded-3xl bg-white border border-gray-100 shadow-card p-5 text-center">
          <Trophy className="w-28 h-auto mx-auto" />
          <p className="font-display text-lg font-extrabold text-ink mt-2">No results yet</p>
          <p className="text-sm text-gray-600 mt-1">
            {matchDay
              ? 'After each game, tap Add result. The table and Team of the Day build themselves.'
              : 'On match day, add each game’s score here. The table and Team of the Day build themselves.'}
          </p>
        </section>
      )}

      <div className="sticky z-10 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] md:bottom-4 mt-4">
        <button
          onClick={() => setAdding(true)}
          className="w-full min-h-14 rounded-2xl bg-volt-400 text-ink text-base font-extrabold border-2 border-ink shadow-sticker hover:bg-volt-300 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition flex items-center justify-center gap-2"
        >
          <span className="text-xl leading-none" aria-hidden>
            +
          </span>
          Add result
        </button>
      </div>

      {adding && <ResultSheet lineup={lineup} actions={actions} onClose={() => setAdding(false)} />}
    </div>
  );
}
