'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from '@/components/toast';
import { ConfirmDialog } from '@/components/confirm-dialog';
import {
  addMatchGame,
  balanceLineup,
  deleteMatchGame,
  getLineup,
  saveLineup,
  type Lineup,
  type TeamKey,
} from '@/lib/api';
import { TEAM_KEYS, pitchName, teamName } from './kit';
import { SquadSummary } from './squad-summary';
import { TeamsStep } from './teams-step';
import { CaptainsStep } from './captains-step';
import { ResultsStep } from './results-step';

export type Step = 'teams' | 'captains' | 'results';
const STEPS: Step[] = ['teams', 'captains', 'results'];
const LABEL: Record<Step, string> = { teams: 'Teams', captains: 'Captains', results: 'Results' };

/** Everything a step can do to the lineup. Saves are optimistic: the screen changes on the tap. */
export interface LineupActions {
  assign: (playerId: string, team: TeamKey | null) => void;
  makeCaptain: (team: TeamKey, playerId: string | null) => void;
  setCount: (n: number) => void;
  balance: () => void;
  addGame: (game: { teamA: TeamKey; teamB: TeamKey; scoreA: number; scoreB: number }) => Promise<boolean>;
  deleteGame: (gameId: string) => void;
  busy: string | null;
}

type Ask = { title: string; message: string; label: string; danger?: boolean; go: () => void };

/** First step to show: Results once there are any, else Captains once everyone has a bib, else Teams. */
function startStep(l: Lineup): Step {
  const asked = new URLSearchParams(window.location.search).get('step');
  if (STEPS.includes(asked as Step)) return asked as Step;
  if (l.games.length) return 'results';
  if (l.squad.every((m) => m.team)) return 'captains';
  return 'teams';
}

/**
 * Match day as a 3-step team-sheet board: put bibs on (Teams), hand out armbands (Captains), then
 * keep the score (Results). The step switcher is portalled into `stepperSlot` — the page's sticky
 * tab bar — so it stays pinned under the tabs.
 */
export function MatchDayBoard({
  sessionId,
  matchDay = false,
  showSquad = false,
  stepperSlot,
  onSquadChange,
}: {
  sessionId: string;
  matchDay?: boolean;
  /** Show "Who's playing" (in / out) — only while the game is still on. */
  showSquad?: boolean;
  stepperSlot?: HTMLElement | null;
  onSquadChange?: () => void;
}) {
  const toast = useToast();
  const [lineup, setLineup] = useState<Lineup | null>(null);
  const [step, setStep] = useState<Step | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [ask, setAsk] = useState<Ask | null>(null);
  // First load failed: offer a retry instead of an endless skeleton.
  const [failed, setFailed] = useState(false);
  // Bumped when the whole lineup changes at once (balance, a new squad), so the Teams list re-sorts.
  const [settleKey, setSettleKey] = useState(0);
  const seq = useRef(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const load = useCallback(
    () =>
      getLineup(sessionId)
        .then((l) => {
          setFailed(false);
          setLineup(l);
          setSettleKey((k) => k + 1);
          setStep((s) => s ?? startStep(l));
        })
        .catch(() => setFailed(true)),
    [sessionId],
  );
  useEffect(() => {
    load();
  }, [load]);

  /**
   * Runs a save. `optimistic` changes the screen straight away; the server's answer replaces it
   * only if no later save has started since (fast taps answer out of order).
   */
  const mutate = useCallback(
    async (call: () => Promise<Lineup>, optimistic?: (l: Lineup) => Lineup) => {
      const mine = ++seq.current;
      if (optimistic) setLineup((l) => (l ? optimistic(l) : l));
      try {
        const next = await call();
        if (mine === seq.current) setLineup(next);
        return true;
      } catch (err) {
        toast.error(err instanceof Error && err.message ? err.message : 'Could not save. Check your connection and try again.');
        load();
        return false;
      }
    },
    [toast, load],
  );

  function chooseStep(s: Step) {
    setStep(s);
    const url = new URL(window.location.href);
    url.searchParams.set('step', s);
    window.history.replaceState(null, '', url);
    // Scrolled down a long list? Start the next step at its top, just under the pinned tabs.
    const header = stepperSlot?.parentElement?.getBoundingClientRect().height ?? 0;
    const top = (rootRef.current?.getBoundingClientRect().top ?? 0) + window.scrollY - header - 8;
    if (window.scrollY > top) window.scrollTo({ top });
  }

  if ((!lineup || !step) && failed) {
    return (
      <div className="rounded-2xl bg-white border border-gray-100 p-5 text-sm text-gray-600" role="alert">
        <p>Couldn&apos;t load the teams. Check your connection and try again.</p>
        <button
          onClick={() => load()}
          className="mt-3 min-h-11 px-4 rounded-xl bg-ink text-sm font-bold text-volt-300 hover:bg-pitch-900"
        >
          Try again
        </button>
      </div>
    );
  }
  if (!lineup || !step) {
    return (
      <div className="space-y-3" aria-busy>
        <div className="h-14 rounded-2xl bg-white/70 border border-gray-100" />
        <div className="h-64 rounded-3xl bg-white/70 border border-gray-100" />
      </div>
    );
  }
  const l = lineup;

  if (l.squad.length === 0) {
    return (
      <>
        {showSquad && <SquadSummary sessionId={sessionId} onChange={() => { load(); onSquadChange?.(); }} />}
        <p className="rounded-2xl bg-white border border-gray-100 p-5 text-sm text-gray-600">
          Nobody&apos;s in yet. Once players say they&apos;re in, you can put them in bibs here.
        </p>
      </>
    );
  }

  const teams = TEAM_KEYS.slice(0, l.teamCount);
  const unpicked = l.squad.filter((m) => !m.team).length;
  const captained = teams.filter((t) => l.captains[t]).length;

  const actions: LineupActions = {
    busy,
    assign: (playerId, team) =>
      void mutate(
        () => saveLineup(sessionId, { teams: { [playerId]: team } }),
        (cur) => {
          const was = cur.squad.find((m) => m.id === playerId);
          const lostArmband = was?.captain && was.team !== team ? was.team : null;
          const captains = { ...cur.captains };
          if (lostArmband) delete captains[lostArmband];
          return {
            ...cur,
            captains,
            squad: cur.squad.map((m) => (m.id === playerId ? { ...m, team, captain: m.team === team ? m.captain : false } : m)),
          };
        },
      ),

    makeCaptain: (team, playerId) =>
      void mutate(
        () => saveLineup(sessionId, { captains: { [team]: playerId } }),
        (cur) => {
          const pick = playerId ? cur.squad.find((m) => m.id === playerId) : null;
          const captains = { ...cur.captains };
          delete captains[team];
          if (pick?.captain && pick.team) delete captains[pick.team];
          if (pick) captains[team] = pitchName(pick);
          return {
            ...cur,
            captains,
            squad: cur.squad.map((m) =>
              m.id === playerId ? { ...m, team, captain: true } : m.captain && m.team === team ? { ...m, captain: false } : m,
            ),
          };
        },
      ),

    setCount: (n) => {
      if (n === l.teamCount) return;
      const gone = TEAM_KEYS.slice(n, l.teamCount);
      const losing = l.squad.filter((m) => m.team && gone.includes(m.team)).length;
      const games = l.games.filter((g) => gone.includes(g.teamA) || gone.includes(g.teamB)).length;
      const go = async () => {
        setBusy('count');
        await mutate(() => saveLineup(sessionId, { teamCount: n }));
        setSettleKey((k) => k + 1);
        setBusy(null);
      };
      if (n < l.teamCount && (losing || games)) {
        const names = gone.map((t) => teamName(t, l.captains)).join(' and ');
        setAsk({
          title: `Play with ${n} teams?`,
          message: [
            losing ? `${losing} player${losing === 1 ? '' : 's'} in ${names} lose their bib.` : '',
            games ? `${games} result${games === 1 ? '' : 's'} with ${names} will be deleted.` : '',
          ]
            .filter(Boolean)
            .join(' '),
          label: `Use ${n} teams`,
          danger: games > 0,
          go,
        });
      } else go();
    },

    balance: () => {
      const moving = l.squad.filter((m) => m.team && !m.captain).length;
      const go = async () => {
        setBusy('balance');
        if (await mutate(() => balanceLineup(sessionId))) toast.success(`Split into ${l.teamCount} balanced teams`);
        setSettleKey((k) => k + 1);
        setBusy(null);
      };
      if (moving === 0) return void go();
      // Self-picked bibs aren't told apart from ones you set, so this counts everyone with a bib.
      setAsk({
        title: 'Reshuffle everyone?',
        message: `${moving} player${moving === 1 ? ' who already has a bib' : 's who already have a bib'} may move, including anyone who picked their own. Captains stay where they are.`,
        label: 'Balance teams',
        go,
      });
    },

    addGame: async (game) => {
      setBusy('game');
      const ok = await mutate(() => addMatchGame(sessionId, game));
      setBusy(null);
      return ok;
    },

    deleteGame: (gameId) => {
      const g = l.games.find((x) => x.id === gameId);
      if (!g) return;
      setAsk({
        title: 'Delete this result?',
        message: `${teamName(g.teamA, l.captains)} ${g.scoreA}–${g.scoreB} ${teamName(g.teamB, l.captains)} comes off today’s table.`,
        label: 'Delete result',
        danger: true,
        go: async () => {
          setBusy(`del-${gameId}`);
          if (await mutate(() => deleteMatchGame(sessionId, gameId))) toast.success('Result deleted');
          setBusy(null);
        },
      });
    },
  };

  const status: Record<Step, string> = {
    teams: unpicked ? `${unpicked} to place` : 'All in bibs',
    captains: `${captained}/${teams.length} picked`,
    results: l.games.length ? `${l.games.length} played` : 'None yet',
  };
  const done: Record<Step, boolean> = {
    teams: unpicked === 0,
    captains: captained === teams.length,
    results: l.games.length > 0,
  };

  const stepper = (
    <nav aria-label="Match day steps" className="mt-2">
      <ol className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-ink">
        {STEPS.map((s, i) => {
          const on = step === s;
          return (
            <li key={s}>
              <button
                onClick={() => chooseStep(s)}
                aria-current={on ? 'step' : undefined}
                className={`w-full min-h-12 flex items-center gap-2 px-2 rounded-xl text-left transition-colors ${
                  on ? 'bg-volt-400 text-ink' : 'text-white hover:bg-white/10'
                }`}
              >
                <span
                  className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-[11px] font-extrabold ${
                    on ? 'bg-ink text-volt-300' : done[s] ? 'bg-volt-400 text-ink' : 'border border-white/40 text-white/80'
                  }`}
                  aria-hidden
                >
                  {done[s] && !on ? '✓' : i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-extrabold leading-tight">{LABEL[s]}</span>
                  <span className={`block text-[10px] font-semibold leading-tight truncate ${on ? 'text-ink/70' : 'text-white/60'}`}>
                    {status[s]}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );

  return (
    <div ref={rootRef}>
      {stepperSlot ? createPortal(stepper, stepperSlot) : <div className="sticky top-0 z-20 py-2 bg-chalk/95">{stepper}</div>}

      {showSquad && (
        <SquadSummary
          sessionId={sessionId}
          onChange={() => {
            load();
            onSquadChange?.();
          }}
        />
      )}

      {step === 'teams' && (
        <TeamsStep lineup={l} actions={actions} settleKey={settleKey} onNext={() => chooseStep('captains')} />
      )}
      {step === 'captains' && (
        <CaptainsStep lineup={l} actions={actions} onBack={() => chooseStep('teams')} onNext={() => chooseStep('results')} />
      )}
      {step === 'results' && <ResultsStep lineup={l} actions={actions} matchDay={matchDay} />}

      <ConfirmDialog
        open={!!ask}
        title={ask?.title ?? ''}
        message={ask?.message ?? ''}
        confirmLabel={ask?.label}
        variant={ask?.danger ? 'danger' : 'default'}
        onConfirm={() => {
          const go = ask?.go;
          setAsk(null);
          go?.();
        }}
        onCancel={() => setAsk(null)}
      />
    </div>
  );
}
