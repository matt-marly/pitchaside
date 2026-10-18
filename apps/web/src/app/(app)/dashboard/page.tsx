'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  getGroups,
  getSessions,
  getSessionVoting,
  formatCurrency,
  type IGroupWithMembers,
  type ISessionWithDetails,
  type SessionVoting,
} from '@/lib/api';
import { SessionStatus, UserRole } from '@pitchaside/shared';
import { Celebration } from '@/components/illustrations';
import { ErrorView } from '@/components/error-view';
import { NewSessionSheet } from '@/components/new-session-sheet';
import { prettyTime } from '@/components/player-ui';
import {
  AccountDetailsSheet,
  MoneyCard,
  NeedsYou,
  daysFromToday,
  featuredGame,
  gameDay,
  gameMoney,
  useGroupMoney,
  type NeedsItem,
} from '@/components/money-card';
import { InviteSheet } from '@/components/home/invite-sheet';
import { QuickActions, InviteIcon, CalendarPlusIcon, ICON_PATHS, icon, type QuickAction } from '@/components/home/quick-actions';
import { MoreActionsSheet, type MoreAction } from '@/components/home/more-actions-sheet';
import { UpdatesBell, type Update } from '@/components/home/updates-bell';
import { transferName } from '@/components/home/transfers-sheet';

const onboardingSteps = [
  {
    step: 1,
    title: 'Create your first group',
    description: 'Set up a pitch group with your team name, player fee, and target size.',
    href: '/groups/new',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
      </svg>
    ),
  },
  {
    step: 2,
    title: 'Add players',
    description: 'Add the regulars so you can track who\'s paid and who hasn\'t.',
    href: '/players/new',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM4 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 10.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
      </svg>
    ),
  },
  {
    step: 3,
    title: 'Schedule a session',
    description: 'Create a match session and payments are auto-generated for each player.',
    href: '/sessions',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
      </svg>
    ),
  },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<IGroupWithMembers[]>([]);
  const [sessions, setSessions] = useState<ISessionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  // Groups didn't load: say so, rather than greeting an organiser as if they had none.
  const [failed, setFailed] = useState(false);
  const [showNewGame, setShowNewGame] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showAllComing, setShowAllComing] = useState(false);
  const [showMore, setShowMore] = useState(false);
  // Several groups: the one picked in the switcher; until then, the one playing soonest.
  const [picked, setPicked] = useState<string | null>(null);
  const [voting, setVoting] = useState<{ sessionId: string; data: SessionVoting } | null>(null);
  const router = useRouter();
  // Treasurers can look but not change anything.
  const canManage = user?.role !== UserRole.TREASURER;

  // The PitchAside team doesn't run a club — their home is HQ.
  useEffect(() => {
    if (user?.role === UserRole.SUPER_ADMIN) router.replace('/hq');
  }, [user, router]);

  const loadAll = () => {
    setFailed(false);
    setLoading(true);
    Promise.all([getGroups(), getSessions()])
      .then(([g, s]) => {
        setGroups(g);
        setSessions(s);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  };
  useEffect(loadAll, []);

  // Default to the group whose game is soonest (a game still being settled counts as now).
  const soonest = useMemo(() => {
    let best: { id: string; days: number } | null = null;
    for (const g of groups) {
      const game = featuredGame(sessions, g.id);
      if (!game) continue;
      const days = Math.abs(daysFromToday(game.date));
      if (!best || days < best.days) best = { id: g.id, days };
    }
    return best?.id ?? groups[0]?.id ?? null;
  }, [groups, sessions]);
  const groupId = picked && groups.some((g) => g.id === picked) ? picked : soonest;
  const group = groups.find((g) => g.id === groupId) ?? null;
  const game = group ? (featuredGame(sessions, group.id) ?? null) : null;
  const money = useGroupMoney(group?.id ?? null, game?.id ?? null);
  const liveGame = money.game ?? game;

  // The vote worth chasing: the latest game played in the last week.
  const voteGame = useMemo(() => {
    if (!groupId) return null;
    return (
      sessions
        .filter((s) => s.groupId === groupId && s.kind !== 'dues' && s.status !== SessionStatus.CANCELLED)
        .filter((s) => {
          const d = daysFromToday(s.date);
          return d <= 0 && d >= -7;
        })
        .sort((a, b) => gameDay(b.date).getTime() - gameDay(a.date).getTime())[0] ?? null
    );
  }, [sessions, groupId]);
  useEffect(() => {
    if (!voteGame) return;
    getSessionVoting(voteGame.id)
      .then((data) => setVoting({ sessionId: voteGame.id, data }))
      .catch(() => {});
  }, [voteGame]);

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-40" />
          <div className="h-8 bg-gray-200 rounded w-56" />
          <div className="h-[420px] bg-gray-200 rounded-[28px]" />
          <div className="h-16 bg-gray-200 rounded-3xl" />
          <div className="h-16 bg-gray-200 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (failed) {
    return (
      <ErrorView
        fullScreen={false}
        eyebrow="No signal"
        title="Couldn’t load your groups"
        message="Check your connection and try again. Your money and games are safe."
        onRetry={loadAll}
        homeHref="/groups"
        homeLabel="Go to groups"
      />
    );
  }

  // New user — no groups yet
  if (groups.length === 0) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <div className="relative rounded-[32px] bg-volt-300 border-2 border-ink shadow-sticker overflow-hidden px-6 pt-6 pb-0 sm:px-10 sm:pt-10 mb-5">
          <div className="absolute inset-0 chalk-dots opacity-60" />
          <div className="relative grid sm:grid-cols-[1fr_auto] items-end gap-2">
            <div className="pb-6 sm:pb-10">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-ink/60">Pre-season</p>
              <h1 className="text-4xl font-extrabold text-ink mt-1 leading-none">
                Welcome{user?.firstName ? `, ${user.firstName}` : ''}!
              </h1>
              <p className="text-sm text-ink/70 mt-3 max-w-xs">
                Let&apos;s get your pitch set up. Follow these steps to start tracking payments.
              </p>
            </div>
            <Celebration className="w-44 sm:w-52 h-auto mx-auto -mb-1" />
          </div>
        </div>

        <div className="space-y-2.5">
          {onboardingSteps.map((item) => (
            <Link
              key={item.step}
              href={item.href}
              className="group flex items-center gap-4 bg-white rounded-2xl p-4 border border-gray-100 shadow-card hover:border-ink hover:-translate-y-0.5 transition-all"
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-ink text-volt-300 flex flex-col items-center justify-center">
                <span className="text-[9px] font-bold uppercase tracking-wider text-white/50 leading-none">Step</span>
                <span className="font-display text-lg font-extrabold leading-none mt-0.5">{item.step}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold text-ink">{item.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-chalk group-hover:bg-volt-400 flex items-center justify-center shrink-0 transition-colors">
                <svg className="w-4 h-4 text-ink" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/groups/new"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-ink text-volt-300 text-sm font-bold rounded-2xl hover:bg-pitch-900 transition-colors shadow-lift"
          >
            Get Started
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    );
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // ── Needs you: only things there's something to do about ──
  const needs: NeedsItem[] = [];
  if (group && money.billing && money.billing.unmatchedTransfers > 0) {
    const n = money.billing.unmatchedTransfers;
    needs.push({
      key: 'unmatched',
      href: `/groups/${group.id}?tab=transfers`,
      title: `${n} transfer${n === 1 ? '' : 's'} to link to a player`,
      detail: 'Pick who paid so their due clears',
      tone: 'kit',
      icon: <span className="font-display text-base font-extrabold">₦</span>,
    });
  }
  if (liveGame) {
    const { owing, coveredByDues } = gameMoney(liveGame);
    if (owing.length > 0) {
      const names = owing.map((p) => p.player?.firstName).filter(Boolean) as string[];
      const when = gameDay(liveGame.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
      needs.push({
        key: 'owing',
        href: `/sessions/${liveGame.id}?tab=payments`,
        title: `${owing.length} still to pay for ${when}`,
        detail:
          names.slice(0, 3).join(', ') +
          (names.length > 3 ? ` +${names.length - 3}` : '') +
          (!coveredByDues && Number(owing[0]?.amount) > 0 ? ` · ${formatCurrency(owing[0].amount)} each` : ''),
        tone: 'sun',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        ),
      });
    }
  }
  if (voting && voteGame && voting.sessionId === voteGame.id && voting.data.open) {
    const v = voting.data;
    const closes = new Date(v.closesAt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    needs.push({
      key: 'vote',
      href: `/sessions/${voteGame.id}?tab=stars`,
      title: 'Vote is open',
      detail: `${v.ballots} of ${v.squadSize} have voted · closes ${closes}`,
      tone: 'volt',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
        </svg>
      ),
    });
  }
  const newMembers = (group?.memberships ?? []).filter(
    (m) => Date.now() - new Date(m.joinedAt).getTime() < 7 * 86_400_000,
  );
  if (group && newMembers.length > 0) {
    const names = newMembers.map((m) => m.player.firstName);
    needs.push({
      key: 'new',
      href: `/groups/${group.id}?tab=members`,
      title: `${newMembers.length} joined this week`,
      detail: names.slice(0, 3).join(', ') + (names.length > 3 ? ` +${names.length - 3}` : ''),
      tone: 'sky',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
        </svg>
      ),
    });
  }

  // Coming up: this group's games after the one in the card. Dues periods aren't games.
  const comingUp = sessions
    .filter(
      (s) =>
        s.groupId === groupId &&
        s.id !== game?.id &&
        s.status === SessionStatus.UPCOMING &&
        s.kind !== 'dues' &&
        daysFromToday(s.date) >= 0,
    )
    .sort((a, b) => gameDay(a.date).getTime() - gameDay(b.date).getTime())
    .slice(0, 4);

  // The bell: everything that needs them, then what's happened lately (money in, new players).
  const toneIcon: Record<NeedsItem['tone'], string> = {
    kit: 'bg-kit-500 text-white',
    sun: 'bg-sun-400 text-ink',
    volt: 'bg-volt-300 text-ink',
    sky: 'bg-sky-300 text-ink',
  };
  const bellNeeds: Update[] = needs
    .filter((n) => n.key !== 'new')
    .map((n) => ({ key: n.key, href: n.href, title: n.title, detail: n.detail, icon: n.icon, iconCls: toneIcon[n.tone] }));
  const bellLatest: Update[] = [
    ...(money.transfers ?? [])
      .filter((t) => t.status !== 'ignored' && t.status !== 'unmatched')
      .slice(0, 6)
      .map((t) => ({
        key: `t-${t.id}`,
        href: `/groups/${group?.id}?tab=transfers`,
        title: `${formatCurrency(t.amount)} from ${transferName(t)}`,
        detail: new Date(t.receivedAt).toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' }),
        icon: <span className="font-display text-base font-extrabold">₦</span>,
        iconCls: 'bg-volt-300 text-ink',
        at: new Date(t.receivedAt).getTime(),
      })),
    ...newMembers.map((m) => ({
      key: `m-${m.id}`,
      href: `/groups/${group?.id}?tab=members`,
      title: `${m.player.firstName} ${m.player.lastName} joined`,
      detail: group?.name,
      icon: <span className="text-sm font-extrabold">{m.player.firstName.charAt(0)}</span>,
      iconCls: 'bg-sky-300 text-ink',
      at: new Date(m.joinedAt).getTime(),
    })),
  ].sort((a, b) => (b.at ?? 0) - (a.at ?? 0));

  // The weekly jobs: bring people in, add someone by hand, take cash at the pitch. The rest is in More.
  const cashHref = liveGame ? `/sessions/${liveGame.id}?tab=payments` : '/sessions';
  const gid = group?.id;
  const quick: QuickAction[] = [
    money.billing?.link ? { key: 'invite', label: 'Invite', icon: <InviteIcon />, onClick: () => setShowInvite(true) } : null,
    canManage ? { key: 'add', label: 'Add player', icon: icon(ICON_PATHS.addPlayer), onClick: () => router.push('/players/new') } : null,
    canManage ? { key: 'cash', label: 'Record cash', icon: icon(ICON_PATHS.cash), onClick: () => router.push(cashHref) } : null,
    gid && canManage && money.billing?.account
      ? { key: 'withdraw', label: 'Withdraw', icon: icon(ICON_PATHS.withdraw), onClick: () => router.push(`/groups/${gid}?tab=payouts`) }
      : null,
  ].filter(Boolean) as QuickAction[];
  // Everything else, named by where it goes. Nothing here that's already on the home screen.
  const moreSections = [
    {
      title: 'Money',
      actions: [
        gid ? { key: 'history', label: 'Transfer history', icon: icon(ICON_PATHS.history), href: `/groups/${gid}?tab=transfers` } : null,
        liveGame
          ? {
              key: 'payments',
              label: `Payments · ${gameDay(liveGame.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}`,
              icon: icon(ICON_PATHS.cash),
              href: `/sessions/${liveGame.id}?tab=payments`,
            }
          : null,
      ].filter(Boolean) as MoreAction[],
    },
    {
      title: 'Games',
      actions: [
        canManage ? { key: 'new-game', label: 'Schedule a game', icon: <CalendarPlusIcon />, onClick: () => setShowNewGame(true) } : null,
        { key: 'games', label: 'All games', icon: icon(ICON_PATHS.calendar), href: '/sessions' },
        canManage ? { key: 'cup', label: 'Create a Cup', icon: icon(ICON_PATHS.trophy), href: '/competitions/new' } : null,
      ].filter(Boolean) as MoreAction[],
    },
    {
      title: 'Players',
      actions: [{ key: 'players', label: 'Manage players', icon: icon(ICON_PATHS.players), href: '/players' }],
    },
    {
      title: 'Group',
      actions: [
        gid ? { key: 'group', label: 'Group settings', icon: icon(ICON_PATHS.cog), href: `/groups/${gid}` } : null,
        canManage ? { key: 'new-group', label: 'Create a group', icon: icon(ICON_PATHS.plus), href: '/groups/new' } : null,
      ].filter(Boolean) as MoreAction[],
    },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-3.5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-pitch-600">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="text-[26px] leading-tight font-extrabold text-ink mt-0.5">
            {greeting}, {user?.firstName || 'there'}
          </h1>
        </div>
        <UpdatesBell needs={bellNeeds} latest={bellLatest} />
      </div>
      {showMore && <MoreActionsSheet sections={moreSections} onClose={() => setShowMore(false)} />}
      {showInvite && group && money.billing && (
        <InviteSheet
          group={group}
          billing={money.billing}
          canManage={canManage}
          onBilling={money.setBilling}
          onClose={() => setShowInvite(false)}
        />
      )}

      {showNewGame && (
        <NewSessionSheet
          groups={group ? [group, ...groups.filter((g) => g.id !== group.id)] : groups}
          onClose={() => setShowNewGame(false)}
        />
      )}
      {showAccount && group && money.billing && (
        <AccountDetailsSheet group={group} billing={money.billing} onClose={() => setShowAccount(false)} />
      )}

      {/* Several groups: pick whose money and game to show */}
      {groups.length > 1 && (
        <div className="-mx-4 px-4 mb-3 flex gap-2 overflow-x-auto [scrollbar-width:none]" role="group" aria-label="Show group">
          {groups.map((g) => (
            <button
              key={g.id}
              aria-pressed={g.id === groupId}
              onClick={() => setPicked(g.id)}
              className={`shrink-0 h-11 px-4 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${
                g.id === groupId ? 'bg-ink text-volt-300' : 'bg-white border border-gray-200 text-ink hover:border-ink'
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>
      )}

      {group && (
        <MoneyCard
          group={group}
          money={money}
          gameFallback={game}
          canManage={canManage}
          onScheduleGame={() => setShowNewGame(true)}
          onOpenAccount={() => setShowAccount(true)}
          vote={voting && voting.sessionId === liveGame?.id ? voting.data : null}
          onGameEnded={(id) =>
            setSessions((all) => all.map((s) => (s.id === id ? { ...s, status: SessionStatus.COMPLETED } : s)))
          }
        />
      )}

      <QuickActions actions={quick} onMore={() => setShowMore(true)} />

      {/* The top two; the rest are in the bell */}
      {/* Only what the card above doesn't already show; the bell keeps the full list */}
      <NeedsYou items={needs.filter((n) => !['new', 'unmatched', 'owing'].includes(n.key)).slice(0, 2)} />

      {comingUp.length > 0 && (
        <section className="mt-6" aria-labelledby="coming-up">
          <div className="flex items-center justify-between mb-2">
            <h2 id="coming-up" className="text-base font-bold text-ink">
              Coming up
            </h2>
            {comingUp.length > 1 && (
              <button
                onClick={() => setShowAllComing((v) => !v)}
                aria-expanded={showAllComing}
                className="h-11 -my-2 px-1 text-sm font-bold text-pitch-700"
              >
                {showAllComing ? 'Show less' : `See all ${comingUp.length}`}
              </button>
            )}
          </div>
          <div className="bg-white rounded-3xl border border-gray-100 shadow-card divide-y divide-gray-100 overflow-hidden">
            {(showAllComing ? comingUp : comingUp.slice(0, 1)).map((session, i) => {
              const progress = session.targetAmount > 0
                ? Math.round((session.collectedAmount / session.targetAmount) * 100)
                : 0;
              const d = gameDay(session.date);
              const kickoff = session.kickoffTime || group?.kickoffTime;
              return (
                <Link
                  key={session.id}
                  href={`/sessions/${session.id}`}
                  style={{ animationDelay: `${i * 40}ms` }}
                  className="animate-rise flex items-center gap-3 px-3 py-2.5 hover:bg-chalk transition-colors"
                >
                  <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 border border-gray-200 text-center">
                    <div className="bg-kit-500 text-ink text-[9px] font-extrabold uppercase tracking-wider py-px">
                      {d.toLocaleDateString('en-GB', { month: 'short' })}
                    </div>
                    <div className="font-display text-base font-extrabold text-ink leading-6">{d.getDate()}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-ink truncate">
                      {d.toLocaleDateString('en-GB', { weekday: 'long' })}
                      {kickoff ? ` · ${prettyTime(kickoff)}` : ''}
                    </p>
                    <p className="text-xs text-gray-600 tabular-nums">
                      {formatCurrency(session.collectedAmount)} of {formatCurrency(session.targetAmount)} · {progress}%
                    </p>
                  </div>
                  <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
