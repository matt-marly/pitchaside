'use client';

import { useEffect, useRef } from 'react';
import { buzz } from '@/components/motion';
import type { Lineup } from '@/lib/api';
import type { LineupActions } from './board';
import { Armband, BibWord, Shirt, TEAM_KEYS, avgOf, pitchName, teamName } from './kit';

/**
 * Step 2: one card per team; tap a name to give them the armband (one per team). The team then
 * goes by their name: "Team Ada". Tap the captain again to take it back.
 */
export function CaptainsStep({
  lineup,
  actions,
  onBack,
  onNext,
}: {
  lineup: Lineup;
  actions: LineupActions;
  onBack: () => void;
  onNext: () => void;
}) {
  const teams = TEAM_KEYS.slice(0, lineup.teamCount);
  const unpicked = lineup.squad.filter((m) => !m.team).length;
  const allSet = teams.every((t) => lineup.captains[t]);
  // Names flip and armbands go on when they change, not when the step opens.
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
  }, []);
  const anim = (cls: string) => (mounted.current ? cls : '');

  return (
    <div>
      <p className="px-1 mb-3 text-sm text-gray-600">Tap a name to give them the armband. The team takes their name.</p>

      {unpicked > 0 && (
        <button
          onClick={onBack}
          className="w-full mb-3 min-h-11 flex items-center gap-2 px-3 py-2 rounded-2xl bg-sun-400/25 text-left text-xs font-semibold text-ink"
        >
          <Shirt team={null} className="w-6 h-6 shrink-0" />
          <span className="flex-1">
            {unpicked} player{unpicked === 1 ? ' has' : 's have'} no bib yet.
          </span>
          <span className="font-bold underline underline-offset-2">Put them in a team</span>
        </button>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        {teams.map((t) => {
          const members = lineup.squad
            .filter((m) => m.team === t)
            .sort((a, b) => Number(b.captain) - Number(a.captain) || pitchName(a).localeCompare(pitchName(b)));
          const avg = avgOf(lineup.squad, t);
          const name = teamName(t, lineup.captains);
          return (
            <section key={t} className="rounded-3xl bg-white border border-gray-100 shadow-card overflow-hidden">
              <header className="flex items-center gap-2.5 px-4 py-3 bg-ink turf-stripes">
                <Shirt team={t} label={members.length} className="w-9 h-9 shrink-0" onDark />
                <h2 key={name} className={`flex-1 min-w-0 font-display text-lg font-extrabold text-white truncate ${anim('animate-flip-in')}`}>
                  {name}
                </h2>
                <BibWord team={t} captains={lineup.captains} className="text-xs text-white/60" />
                {avg != null && <span className="shrink-0 text-[11px] font-bold text-white/60">avg {avg}</span>}
              </header>
              {members.length === 0 ? (
                <p className="px-4 py-4 text-xs text-gray-500">
                  Nobody in this bib yet.{' '}
                  <button onClick={onBack} className="font-bold text-pitch-700 underline underline-offset-2 min-h-11">
                    Add players
                  </button>
                </p>
              ) : (
                <div role="radiogroup" aria-label={`Captain of ${name}`} className="p-1.5">
                  {members.map((m) => (
                    <div key={m.id}>
                      <button
                        role="radio"
                        aria-checked={m.captain}
                        onClick={() => {
                          buzz(10);
                          actions.makeCaptain(t, m.captain ? null : m.id);
                        }}
                        className={`w-full min-h-12 flex items-center gap-3 px-2.5 rounded-xl text-left transition-colors ${
                          m.captain ? 'bg-volt-300' : 'hover:bg-chalk'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center ${
                            m.captain ? 'border-ink bg-ink' : 'border-gray-500'
                          }`}
                          aria-hidden
                        >
                          {m.captain && <span className="w-2 h-2 rounded-full bg-volt-400" />}
                        </span>
                        <span className={`flex-1 min-w-0 truncate text-[15px] ${m.captain ? 'font-extrabold' : 'font-semibold'} text-ink`}>
                          {pitchName(m)}
                        </span>
                        {m.captain && <Armband className={anim('animate-kit-on')} />}
                        {m.ovr != null && <span className="w-7 text-right text-xs font-bold text-gray-600 tabular-nums">{m.ovr}</span>}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      <div className="sticky z-10 bottom-[calc(var(--tabbar-space)+env(safe-area-inset-bottom))] md:bottom-4 mt-4">
        <button
          onClick={onNext}
          className={`w-full min-h-14 rounded-2xl text-sm font-extrabold flex items-center justify-center gap-1.5 shadow-lift transition-colors ${
            allSet ? 'bg-volt-400 text-ink border-2 border-ink shadow-sticker' : 'bg-ink text-volt-300 ring-2 ring-chalk'
          }`}
        >
          Next: results
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
