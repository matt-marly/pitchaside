'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { buzz } from '@/components/motion';
import { BallSpinner } from '@/components/skeleton';
import type { Lineup, TeamKey } from '@/lib/api';
import type { LineupActions } from './board';
import { Armband, PaidMark, Shirt, TEAMS, TEAM_KEYS, avgOf, pitchName, teamName, type SquadMember } from './kit';

/** The side with the fewest players: where the next bib most likely goes. */
function emptiest(l: Lineup): TeamKey {
  const teams = TEAM_KEYS.slice(0, l.teamCount);
  return teams.reduce((best, t) => (l.squad.filter((m) => m.team === t).length < l.squad.filter((m) => m.team === best).length ? t : best));
}

/**
 * Step 1: pick a bib on the rack, then tap players to put it on — one tap each. Tapping someone
 * already in that bib takes it off. The list keeps its order while you tap (so rows don't jump
 * under your thumb) and settles into teams when you pick another bib.
 */
export function TeamsStep({
  lineup,
  actions,
  settleKey,
  onNext,
}: {
  lineup: Lineup;
  actions: LineupActions;
  settleKey: number;
  onNext: () => void;
}) {
  const teams = TEAM_KEYS.slice(0, lineup.teamCount);
  const [bib, setBib] = useState<TeamKey>(() => emptiest(lineup));
  const [tapped, setTapped] = useState<Set<string>>(new Set());
  const live = useRef(lineup);
  // Counts on the rack flip when they change, not when the step first opens.
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
  }, []);
  live.current = lineup;

  // A side that no longer exists can't stay selected.
  const selected = teams.includes(bib) ? bib : teams[0];

  // Frozen order: which group each player sits in. Recomputed when the bib changes or the lineup
  // changes wholesale — never on a single tap.
  const [groups, setGroups] = useState<{ team: TeamKey | null; ids: string[] }[]>([]);
  const ids = lineup.squad.map((m) => m.id).sort().join();
  useEffect(() => {
    const l = live.current;
    const keys = TEAM_KEYS.slice(0, l.teamCount);
    const byName = (a: SquadMember, b: SquadMember) => Number(b.captain) - Number(a.captain) || pitchName(a).localeCompare(pitchName(b));
    const of = (t: TeamKey | null) => l.squad.filter((m) => m.team === t).sort(byName).map((m) => m.id);
    setGroups([{ team: null, ids: of(null) }, ...keys.map((t) => ({ team: t, ids: of(t) }))]);
  }, [selected, settleKey, ids, lineup.teamCount]);

  const byId = useMemo(() => new Map(lineup.squad.map((m) => [m.id, m])), [lineup.squad]);
  const count = (t: TeamKey | null) => lineup.squad.filter((m) => m.team === t).length;
  const unpicked = count(null);
  const placed = lineup.squad.length - unpicked;

  function tap(m: SquadMember) {
    const next = m.team === selected ? null : selected;
    buzz(next ? 12 : [6, 40, 6]);
    setTapped((s) => new Set(s).add(m.id));
    actions.assign(m.id, next);
  }

  // A plain render function (not a component) so rows keep their identity between taps.
  const row = (m: SquadMember) => {
    const mine = m.team === selected;
    const name = pitchName(m);
    return (
      <li key={m.id}>
        <button
          onClick={() => tap(m)}
          aria-pressed={mine}
          aria-label={`${name}, ${m.team ? teamName(m.team, lineup.captains) : 'no bib'}. ${mine ? `Tap to take off the ${TEAMS[selected].name.toLowerCase()} bib` : `Tap to put on ${teamName(selected, lineup.captains)}`}`}
          className={`w-full min-h-14 flex items-center gap-3 px-3 py-1.5 text-left rounded-2xl transition-colors active:scale-[0.99] ${
            mine ? 'bg-white shadow-card ring-1 ring-ink/25' : 'bg-white/60 hover:bg-white'
          }`}
        >
          <span key={`${m.id}-${m.team ?? 'none'}`} className={`shrink-0 ${tapped.has(m.id) ? 'animate-kit-on' : ''}`}>
            <Shirt team={m.team} label={name.charAt(0).toUpperCase()} className="w-10 h-10" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="flex items-center gap-1.5">
              <span className="text-[15px] font-bold text-ink truncate">{name}</span>
              {m.captain && <Armband />}
            </span>
            <span className="block text-[11px] text-gray-500 truncate">
              {m.nickname ? `${m.firstName} ${m.lastName}` : m.lastName}
            </span>
          </span>
          <PaidMark paid={m.paid} />
          {m.ovr != null && <span className="w-7 text-right text-xs font-extrabold text-gray-500 tabular-nums">{m.ovr}</span>}
        </button>
      </li>
    );
  };

  return (
    <div>
      {/* Sides + balance */}
      <section className="rounded-3xl bg-white border border-gray-100 shadow-card p-4 mb-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-bold text-ink" id="sides-label">
            Teams
          </span>
          <div className="flex items-center gap-1 bg-chalk rounded-xl p-1" role="radiogroup" aria-labelledby="sides-label">
            {[2, 3, 4, 5, 6].map((n) => (
              <button
                key={n}
                role="radio"
                aria-checked={lineup.teamCount === n}
                onClick={() => actions.setCount(n)}
                disabled={!!actions.busy}
                className={`w-11 h-11 rounded-lg font-display text-base font-extrabold transition-colors disabled:opacity-50 ${
                  lineup.teamCount === n ? 'bg-ink text-volt-300' : 'text-gray-600 hover:text-ink'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-600">
              <span className="font-display text-base font-extrabold text-ink tabular-nums">{placed}</span> of {lineup.squad.length} in a bib
            </p>
            <div className="mt-1.5 h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full bg-pitch-500 transition-[width] duration-300" style={{ width: `${(placed / lineup.squad.length) * 100}%` }} />
            </div>
          </div>
          <button
            onClick={actions.balance}
            disabled={!!actions.busy}
            className="shrink-0 min-h-11 px-3.5 text-xs font-bold text-ink bg-volt-400 rounded-xl hover:bg-volt-300 disabled:opacity-50 flex items-center gap-1.5"
          >
            {actions.busy === 'balance' ? <BallSpinner className="w-3.5 h-3.5" /> : <span aria-hidden>✦</span>}
            Balance teams
          </button>
        </div>
      </section>

      {/* One list: no bib first, then each side */}
      <div className="space-y-4">
        {groups.map(({ team, ids: rows }) => {
          const members = rows.map((id) => byId.get(id)).filter((m): m is SquadMember => !!m);
          if (!members.length) return null;
          const avg = team ? avgOf(lineup.squad, team) : null;
          return (
            <section key={team ?? 'none'} aria-label={team ? teamName(team, lineup.captains) : 'No bib yet'}>
              <h3 className="flex items-center gap-2 px-1 mb-1.5 text-xs font-bold text-gray-600">
                {team ? (
                  <>
                    <span className={`w-3 h-3 rounded-sm ${TEAMS[team].swatch}`} aria-hidden />
                    <span className="text-ink">{teamName(team, lineup.captains)}</span>
                    <span className="tabular-nums">{count(team)}</span>
                    {avg != null && <span className="ml-auto font-semibold text-gray-500">avg {avg}</span>}
                  </>
                ) : (
                  <>
                    <span className="text-ink">No bib yet</span>
                    <span className="tabular-nums">{unpicked ? `${unpicked} left` : 'all done'}</span>
                  </>
                )}
              </h3>
              <ul className="space-y-1.5">
                {members.map(row)}
              </ul>
            </section>
          );
        })}
      </div>

      {lineup.squad.some((m) => m.paid === 'unpaid') && (
        <p className="mt-3 px-1 flex items-center gap-1.5 text-[11px] text-gray-500">
          <span className="w-2 h-2 rounded-full bg-kit-500" aria-hidden /> Hasn’t paid for this game
        </p>
      )}

      {/* The bib rack */}
      <div className="sticky z-10 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] md:bottom-4 mt-4">
        <div className="rounded-3xl bg-ink turf-stripes shadow-lift p-2.5">
          {unpicked === 0 ? (
            <div className="flex items-center justify-between gap-2 pl-2 mb-1.5">
              <p className="text-xs font-bold text-volt-300">Everyone&apos;s in a bib</p>
              <button
                onClick={onNext}
                className="shrink-0 min-h-11 px-3.5 rounded-xl text-xs font-extrabold flex items-center gap-1 bg-volt-400 text-ink hover:bg-volt-300 animate-land"
              >
                Next: captains
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>
          ) : (
            <p className="px-2 pt-0.5 pb-1.5 text-[11px] text-white/70 truncate">
              Tap players to put on <span className="font-bold text-white">{teamName(selected, lineup.captains)}</span>. Tap again to take it off.
            </p>
          )}
          <div role="radiogroup" aria-label="Bib to put on" className="grid gap-1" style={{ gridTemplateColumns: `repeat(${teams.length}, minmax(0, 1fr))` }}>
            {teams.map((t) => {
              const on = t === selected;
              const n = count(t);
              return (
                <button
                  key={t}
                  role="radio"
                  aria-checked={on}
                  aria-label={`${teamName(t, lineup.captains)}, ${n} player${n === 1 ? '' : 's'}`}
                  onClick={() => {
                    if (t !== selected) buzz(8);
                    setBib(t);
                  }}
                  className={`relative min-h-[68px] flex flex-col items-center justify-center gap-0.5 rounded-2xl px-1 transition-all ${
                    on ? 'bg-white/12 ring-2 ring-volt-400' : 'hover:bg-white/5'
                  }`}
                >
                  <span className={`block transition-transform ${on ? '-translate-y-0.5 scale-110' : ''}`}>
                    <span key={n} className={`block ${mounted.current ? 'animate-flip-in' : ''}`}>
                      <Shirt team={t} label={n} className="w-11 h-11 drop-shadow-[2px_2px_0_rgba(0,0,0,0.35)]" onDark />
                    </span>
                  </span>
                  <span className={`max-w-full truncate text-[11px] font-bold leading-tight ${on ? 'text-volt-300' : 'text-white/70'}`}>
                    {teamName(t, lineup.captains).replace(/^Team /, '')}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
