'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { KeepHyphens } from '@/components/brand';
import { EmptyState } from '@/components/empty-state';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { useToast } from '@/components/toast';
import { JerseyBadge, kitFor } from '@/components/illustrations';
import { GroupAccountCard, TransfersPanel } from '@/components/group-billing';
import { PayoutsPanel } from '@/components/group-payouts';
import { NewSessionSheet } from '@/components/new-session-sheet';
import { frequencyLabel } from '@/lib/billing';
import { LeagueTableView } from '@/components/ratings';
import { AccountDetailsSheet, MoneyCard, PlusIcon, daysFromToday, gameDay, gameStatusOf, useGroupMoney } from '@/components/money-card';
import { InviteSheet } from '@/components/home/invite-sheet';
import { InviteIcon, ICON_PATHS, icon } from '@/components/home/quick-actions';
import { SheetTitle } from '@/components/home/sheet-title';
import { Sheet } from '@/components/sheet';
import { btnSecondary } from '@/components/buttons';
import { GamesList } from '@/components/group/games-list';
import { MemberSheet, type MemberDue } from '@/components/group/member-sheet';
import { GroupEditSheet, type GroupEditData } from '@/components/group/group-edit-sheet';
import { useAuth } from '@/lib/auth';
import {
  getGroup,
  getSessionsPaginated,
  getPlayers,
  addMember,
  addMeToGroup,
  removeMember,
  deleteGroup,
  updateGroup,
  formatCurrency,
  getGroupTable,
  type LeagueTable,
  type IGroupWithMembers,
  type ISessionWithDetails,
} from '@/lib/api';
import { PaymentStatus, PaymentType, UserRole } from '@pitchaside/shared';
import type { IPlayer } from '@pitchaside/shared';

type Tab = 'members' | 'games' | 'table' | 'money';

/** Old links (?tab=sessions / transfers / payouts, e.g. Withdraw on the home) still land in the right place. */
function tabFromUrl(t: string | null): { tab: Tab; money: 'transfers' | 'payouts' } {
  if (t === 'sessions' || t === 'games') return { tab: 'games', money: 'transfers' };
  if (t === 'table') return { tab: 'table', money: 'transfers' };
  if (t === 'transfers' || t === 'money') return { tab: 'money', money: 'transfers' };
  if (t === 'payouts') return { tab: 'money', money: 'payouts' };
  return { tab: 'members', money: 'transfers' };
}

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const [group, setGroup] = useState<IGroupWithMembers | null>(null);
  const [sessions, setSessions] = useState<ISessionWithDetails[]>([]);
  // The API sends the newest games first, 20 at a time (100 at most per call); "Show older games" asks for more.
  const [gameLimit, setGameLimit] = useState(20);
  const [gameTotal, setGameTotal] = useState(0);
  const [loadingGames, setLoadingGames] = useState(false);
  const [allPlayers, setAllPlayers] = useState<IPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>(() => tabFromUrl(searchParams.get('tab')).tab);
  const [moneyView, setMoneyView] = useState<'transfers' | 'payouts'>(() => tabFromUrl(searchParams.get('tab')).money);
  const [table, setTable] = useState<LeagueTable | null>(null);
  const [tableFailed, setTableFailed] = useState(false);
  const [wantEdit, setWantEdit] = useState(false);
  // Balance, account and transfers, kept fresh the same way as on the home.
  const money = useGroupMoney(id, null);
  const billing = money.billing;
  const [focusTransfer, setFocusTransfer] = useState<string | null>(searchParams.get('transfer'));
  const [showMenu, setShowMenu] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [openMember, setOpenMember] = useState<string | null>(null);
  // The tabs pin to the top once the page scrolls past them; this marks when they're pinned (for the shadow).
  const tabTopRef = useRef<HTMLDivElement>(null);
  const [tabsPinned, setTabsPinned] = useState(false);
  useEffect(() => {
    const el = tabTopRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setTabsPinned(!e.isIntersecting && e.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, [loading]);
  const [query, setQuery] = useState('');
  const [memberFilter, setMemberFilter] = useState<'all' | 'owes' | 'paid' | 'out'>('all');

  // Add member state
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [addingMe, setAddingMe] = useState(false);

  // Create session state
  const [showCreateSession, setShowCreateSession] = useState(false);

  // Edit group state
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<GroupEditData>({
    name: '',
    description: '',
    location: '',
    schedule: '',
    kickoffTime: '',
    targetPlayers: 10,
    feePerPlayer: 10,
    paymentType: PaymentType.PER_SESSION as string,
    requireRsvp: false,
    contributionsVisibility: 'private',
  });
  const [saving, setSaving] = useState(false);

  // Confirm dialog state
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant: 'danger' | 'default';
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    Promise.all([getGroup(id), getSessionsPaginated(1, 20, id), getPlayers()])
      .then(([g, s, p]) => {
        setGroup(g);
        setSessions(s.data);
        setGameTotal(s.meta.total);
        setAllPlayers(p);
      })
      .catch(() => {
        toast.error('That group couldn’t be opened. It may have been deleted, or you’re offline.');
        router.replace('/groups');
      })
      .finally(() => setLoading(false));
    loadTable();
    // Opened from the home's "Group settings": go straight to editing.
    if (searchParams.get('edit') === '1') setWantEdit(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, router]);

  function loadTable() {
    setTableFailed(false);
    getGroupTable(id).then(setTable).catch(() => setTableFailed(true));
  }

  // ?edit=1 waits for the group to load, then opens the edit form once.
  useEffect(() => {
    if (wantEdit && group) {
      setWantEdit(false);
      startEdit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantEdit, group]);

  async function refreshPayments() {
    const [s] = await Promise.all([getSessionsPaginated(1, gameLimit, id), money.reload()]);
    setSessions(s.data);
    setGameTotal(s.meta.total);
  }

  async function showOlderGames() {
    const limit = Math.min(100, gameLimit + 20);
    setLoadingGames(true);
    try {
      const s = await getSessionsPaginated(1, limit, id);
      setSessions(s.data);
      setGameTotal(s.meta.total);
      setGameLimit(limit);
    } catch {
      toast.error('Older games didn’t load. Try again.');
    } finally {
      setLoadingGames(false);
    }
  }

  /** Switch section; if the tabs have been scrolled under the top, bring the new section's start into view. */
  function openTab(t: Tab, view?: 'transfers' | 'payouts') {
    setTab(t);
    if (view) setMoneyView(view);
    // The tab lives in the URL, so a refresh, a shared link or coming Back from a game lands here again.
    const urlTab = t === 'money' ? ((view ?? moneyView) === 'payouts' ? 'payouts' : 'money') : t;
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${urlTab === 'members' ? '' : `?tab=${urlTab}`}`);
    const bar = document.getElementById('group-tabs');
    if (bar && bar.getBoundingClientRect().top <= 1) {
      requestAnimationFrame(() => document.getElementById('group-tab-top')?.scrollIntoView({ block: 'start' }));
    }
  }

  function startEdit() {
    if (!group) return;
    setEditData({
      name: group.name,
      description: group.description || '',
      location: group.location || '',
      schedule: group.schedule || '',
      kickoffTime: group.kickoffTime || '',
      targetPlayers: group.targetPlayers,
      feePerPlayer: group.feePerPlayer,
      paymentType: group.paymentType,
      requireRsvp: !!group.requireRsvp,
      contributionsVisibility: group.contributionsVisibility ?? 'private',
    });
    setEditing(true);
  }

  async function handleSaveEdit(editData: GroupEditData) {
    setSaving(true);
    try {
      await updateGroup(id, {
        name: editData.name,
        description: editData.description || undefined,
        location: editData.location || undefined,
        schedule: editData.schedule || undefined,
        kickoffTime: editData.kickoffTime || undefined,
        targetPlayers: editData.targetPlayers,
        feePerPlayer: editData.feePerPlayer,
        paymentType: editData.paymentType as PaymentType,
        requireRsvp: editData.requireRsvp,
        contributionsVisibility: editData.contributionsVisibility,
      });
      const updated = await getGroup(id);
      setGroup(updated);
      setEditing(false);
      toast.success('Changes saved');
      refreshPayments().catch(() => {});
    } catch {
      toast.error('The changes didn’t save. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteGroup() {
    setShowMenu(false);
    setConfirm({
      title: 'Delete this group?',
      message: `Are you sure you want to delete "${group?.name}"? This can't be undone.`,
      confirmLabel: 'Delete group',
      variant: 'danger',
      onConfirm: async () => {
        setConfirm(null);
        try {
          await deleteGroup(id);
          toast.success('Group deleted');
          router.push('/groups');
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'The group wasn’t deleted. Try again.');
        }
      },
    });
  }

  async function handleAddMember() {
    if (!selectedPlayerId) return;
    setAddingMember(true);
    try {
      await addMember(id, { playerId: selectedPlayerId });
      const updated = await getGroup(id);
      setGroup(updated);
      refreshPayments().catch(() => {});
      setShowAddMember(false);
      setSelectedPlayerId('');
      toast.success('Player added');
    } catch {
      toast.error('The player wasn’t added. Try again.');
    } finally {
      setAddingMember(false);
    }
  }

  /** The organiser plays too: add their own player record to this group. */
  async function handleAddMe() {
    setAddingMe(true);
    try {
      await addMeToGroup(id);
      setGroup(await getGroup(id));
      refreshPayments().catch(() => {});
      toast.success("You're in the squad");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add you to the group");
    } finally {
      setAddingMe(false);
    }
  }

  function handleRemoveMember(playerId: string, playerName: string, credit = 0) {
    setConfirm({
      title: `Remove ${playerName}?`,
      // Their credit is dropped with them, so say how much before it goes.
      message:
        credit > 0
          ? `${playerName} has ${formatCurrency(credit)} credit in this group that hasn't paid a due yet. Removing them drops it from the books, so refund them first if it's owed back. Remove anyway?`
          : `${playerName} comes off this group's list.`,
      confirmLabel: credit > 0 ? 'Remove anyway' : 'Remove',
      variant: 'danger',
      onConfirm: async () => {
        setConfirm(null);
        try {
          await removeMember(id, playerId, credit > 0);
          const updated = await getGroup(id);
          setGroup(updated);
          toast.success(`${playerName} removed`);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'They weren’t removed. Try again.');
        }
      },
    });
  }

  if (loading || !group) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <div className="animate-pulse" aria-busy="true" aria-label="Loading the group">
          <div className="h-8 w-28 bg-gray-100 rounded-full mb-4" />
          <div className="h-[244px] bg-ink/90 rounded-[28px]" />
          <div className="mt-3 h-[52px] bg-gray-100 rounded-2xl" />
          <div className="mt-6 h-5 w-24 bg-gray-100 rounded" />
          <div className="mt-3 h-64 bg-gray-100 rounded-3xl" />
        </div>
      </div>
    );
  }

  const memberIds = new Set(group.memberships?.map((m) => m.player.id) || []);
  const availablePlayers = allPlayers.filter((p) => !memberIds.has(p.id));
  const memberCount = group.memberships?.length || 0;
  const myEmail = user?.email.trim().toLowerCase();
  const imAMember = group.memberships?.some((m) => m.player.email?.trim().toLowerCase() === myEmail);
  const canManage = user?.role !== UserRole.TREASURER;
  const unmatched = billing?.unmatchedTransfers ?? 0;

  // What each member's row says about money: the next game (or this period's dues, for groups
  // that collect monthly/weekly), so "who still owes" reads straight off the list.
  const perGame = group.paymentType === PaymentType.PER_SESSION;
  // Still building the squad (fewer members than places in a game): inviting is the main job here.
  const recruiting = memberCount < group.targetPlayers;
  const nextGame = sessions
    .filter((s) => s.kind !== 'dues' && s.status === 'upcoming' && daysFromToday(s.date) >= 0)
    .sort((a, b) => gameDay(a.date).getTime() - gameDay(b.date).getTime())[0];
  const nextDue = perGame
    ? sessions
        .filter((s) => s.kind !== 'dues' && s.status === 'upcoming' && daysFromToday(s.date) >= 0)
        .sort((a, b) => gameDay(a.date).getTime() - gameDay(b.date).getTime())[0]
    : sessions
        .filter((s) => s.kind === 'dues' && s.status !== 'cancelled')
        .sort((a, b) => gameDay(b.date).getTime() - gameDay(a.date).getTime())
        .find((s) => daysFromToday(s.date) <= 0);
  const dueLabel = nextDue
    ? nextDue.kind === 'dues' && nextDue.label
      ? `${nextDue.label} dues`
      : gameDay(nextDue.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    : '';
  const dueOf = (playerId: string): MemberDue => {
    if (!nextDue) return null;
    const p = nextDue.payments?.find((x) => x.playerId === playerId);
    if (!p) return group.requireRsvp ? { label: dueLabel, state: 'out', amount: 0 } : null;
    const st = gameStatusOf(p);
    return {
      label: dueLabel,
      state: st === PaymentStatus.PAID ? 'paid' : st === PaymentStatus.WAIVED ? 'waived' : 'owes',
      amount: Number(p.amount),
    };
  };
  const members = (group.memberships ?? []).map((m) => ({ ...m, due: dueOf(m.player.id) }));
  const paidCount = members.filter((m) => m.due?.state === 'paid').length;
  const owesCount = members.filter((m) => m.due?.state === 'owes').length;
  const outCount = members.filter((m) => m.due?.state === 'out').length;
  // Joined in the last week: worth a word (the exact date is in their card).
  const isNew = (joinedAt: string) => Date.now() - new Date(joinedAt).getTime() < 7 * 86_400_000;
  const sentence = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
  const q = query.trim().toLowerCase();
  const shown = members
    .filter((m) => memberFilter === 'all' || m.due?.state === memberFilter)
    .filter((m) => !q || `${m.player.firstName} ${m.player.lastName} ${m.player.nickname ?? ''}`.toLowerCase().includes(q))
    .sort((a, b) => `${a.player.firstName} ${a.player.lastName}`.localeCompare(`${b.player.firstName} ${b.player.lastName}`));
  const opened = members.find((m) => m.player.id === openMember);

  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: 'members', label: 'Members' },
    { key: 'games', label: perGame ? 'Games' : 'Dues' },
    { key: 'table', label: 'Table' },
    { key: 'money', label: 'Money', badge: unmatched },
  ];


  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <Link
        href="/groups"
        className="inline-flex items-center gap-1.5 pl-2 pr-3 py-1.5 -ml-1 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-full hover:text-ink hover:border-gray-300 transition-colors mb-4"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        All groups
      </Link>

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title ?? ''}
        message={confirm?.message ?? ''}
        confirmLabel={confirm?.confirmLabel}
        variant={confirm?.variant}
        onConfirm={confirm?.onConfirm ?? (() => {})}
        onCancel={() => setConfirm(null)}
      />
      {showMenu && (
        <GroupMenuSheet
          name={group.name}
          onEdit={() => {
            setShowMenu(false);
            startEdit();
          }}
          onDelete={handleDeleteGroup}
          onClose={() => setShowMenu(false)}
        />
      )}
      {showInvite && billing && (
        <InviteSheet group={group} billing={billing} canManage={canManage} onBilling={money.setBilling} onClose={() => setShowInvite(false)} />
      )}
      {showAccount && billing && <AccountDetailsSheet group={group} billing={billing} onClose={() => setShowAccount(false)} />}
      {opened && (
        <MemberSheet
          key={opened.player.id}
          player={opened.player}
          joinedAt={opened.joinedAt}
          credit={Number(opened.credit ?? 0)}
          due={opened.due}
          onClose={() => setOpenMember(null)}
          onSaved={(p) =>
            setGroup((g) =>
              g ? { ...g, memberships: g.memberships?.map((m) => (m.player.id === p.id ? { ...m, player: { ...m.player, ...p } } : m)) } : g,
            )
          }
          onRemove={() => {
            setOpenMember(null);
            handleRemoveMember(opened.player.id, `${opened.player.firstName} ${opened.player.lastName}`, Number(opened.credit ?? 0));
          }}
        />
      )}

      {/* Header */}
      {editing && (
        <GroupEditSheet initial={editData} saving={saving} onSave={handleSaveEdit} onClose={() => setEditing(false)} />
      )}
      {(
        <section aria-label={group.name} className="relative rounded-[28px] bg-ink text-white overflow-hidden shadow-lift">
          <div className="absolute inset-0 turf-stripes-soft" />
          <div className="relative p-5">
            {/* Who: the club's shirt and name, like the cover of a match programme */}
            <div className="flex items-start gap-3.5">
              <JerseyBadge label={group.name.charAt(0).toUpperCase()} name={group.name} className="w-14 h-14 shrink-0 -mt-1" />
              <div className="flex-1 min-w-0">
                <h1 className="font-display text-[26px] leading-[1.1] font-extrabold text-white line-clamp-2">
                  <KeepHyphens text={group.name} />
                </h1>
                {group.location && <p className="mt-1 text-[13px] font-semibold leading-snug text-white/65 line-clamp-2">{group.location}</p>}
              </div>
              <button
                onClick={() => setShowMenu(true)}
                aria-label="Group options"
                aria-haspopup="dialog"
                className="press w-11 h-11 -mr-1.5 -mt-1.5 shrink-0 rounded-full flex items-center justify-center text-white/80 hover:text-white"
              >
                <span className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <circle cx="5" cy="12" r="1.8" />
                    <circle cx="12" cy="12" r="1.8" />
                    <circle cx="19" cy="12" r="1.8" />
                  </svg>
                </span>
              </button>
            </div>

            {/* The three facts an organiser checks, each a way into its tab (the same strip as the home card) */}
            <div className="mt-5 grid grid-cols-3 rounded-2xl bg-white/[0.06] divide-x divide-white/[0.08]">
              {[
                {
                  key: 'games' as Tab,
                  value: nextGame ? gameDay(nextGame.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', '') : 'None yet',
                  label: 'Next game',
                },
                { key: 'members' as Tab, value: formatCurrency(group.feePerPlayer), label: perGame ? 'Per player' : `Per player, ${frequencyLabel(group.paymentType).toLowerCase()}` },
                {
                  key: 'money' as Tab,
                  value:
                    billing && !billing.account
                      ? 'Set up'
                      : money.balance
                        ? formatCurrency(Number(money.balance.available))
                        : money.balanceFailed
                          ? 'Not loaded'
                          : '₦…',
                  label: 'Balance',
                  money: true,
                },
              ].map((f) => (
                <button
                  key={f.label}
                  onClick={() => {
                    openTab(f.key, f.key === 'money' ? 'transfers' : undefined);
                    requestAnimationFrame(() => document.getElementById('group-tab-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
                  }}
                  className="press min-w-0 flex flex-col px-2.5 py-2.5 text-left hover:bg-white/[0.05] first:rounded-l-2xl last:rounded-r-2xl transition-colors"
                >
                  <span className={`block text-[15px] font-bold tabular-nums tracking-tight whitespace-nowrap ${f.money ? 'text-volt-300' : 'text-white'}`}>
                    {f.value}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-[11px] font-bold leading-tight text-white/65 truncate">
                    {f.money && unmatched > 0 && <span className="w-1.5 h-1.5 shrink-0 rounded-full bg-sun-400 animate-pulse-soft" aria-label={`${unmatched} to match`} />}
                    {f.label}
                  </span>
                </button>
              ))}
            </div>

            {billing && (
              <button
                onClick={() => setShowInvite(true)}
                className={`press mt-3 w-full h-12 inline-flex items-center justify-center gap-2 rounded-2xl text-[15px] transition-colors ${
                  recruiting ? 'bg-volt-400 text-ink font-extrabold hover:bg-volt-300' : 'bg-white/10 text-white font-bold hover:bg-white/15'
                }`}
              >
                <InviteIcon />
                Invite players
              </button>
            )}
          </div>
        </section>
      )}

      {/* Tabs: they stay at the top while a long list scrolls */}
      <div id="group-tab-top" ref={tabTopRef} />
      <div
        id="group-tabs"
        className={`sticky top-0 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-[max(8px,env(safe-area-inset-top))] pb-2 mt-3 mb-3 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85 transition-shadow duration-200 ${
          tabsPinned ? 'shadow-[0_6px_16px_-10px_rgba(15,26,20,0.35)]' : ''
        }`}
      >
        <div role="tablist" aria-label={`${group.name} sections`} className="flex p-1 bg-white border border-gray-200 rounded-2xl">
          {tabs.map((t) => (
            <button
              key={t.key}
              role="tab"
              id={`group-tab-${t.key}`}
              aria-selected={tab === t.key}
              aria-controls="group-panel"
              tabIndex={tab === t.key ? 0 : -1}
              onClick={() => openTab(t.key)}
              onKeyDown={(e) => {
                if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
                const i = tabs.findIndex((x) => x.key === t.key);
                const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length].key;
                openTab(next);
                document.getElementById(`group-tab-${next}`)?.focus();
              }}
              className={`press relative flex-1 min-h-11 px-1 text-[13px] sm:text-sm font-bold whitespace-nowrap rounded-xl transition-colors duration-200 ${
                tab === t.key ? 'bg-ink text-volt-300' : 'text-gray-500 hover:text-ink'
              }`}
            >
              {t.label}
              {!!t.badge && (
                <span
                  className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-kit-500 text-ink text-[10px] font-extrabold flex items-center justify-center"
                  aria-label={`${t.badge} to match`}
                >
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div id="group-panel" role="tabpanel" aria-labelledby={`group-tab-${tab}`}>
      {tab === 'table' && (
        <div className="mb-2">
          <h2 className="text-base font-bold text-ink">Table</h2>
          <p className="text-xs text-gray-500">Points from players&apos; votes after each game</p>
        </div>
      )}
      {tab === 'table' &&
        (table ? (
          <LeagueTableView table={table} />
        ) : tableFailed ? (
          <div className="py-10 text-center">
            <p className="text-sm text-gray-600">The table didn&apos;t load.</p>
            <button onClick={loadTable} className="mt-2 h-11 px-3 text-sm font-bold text-pitch-700">
              Try again
            </button>
          </div>
        ) : (
          <div className="h-40 bg-gray-100 rounded-3xl animate-pulse" />
        ))}

      {/* Money: what's come in, and what's gone out */}
      {tab === 'money' && (
        <div>
          <div role="radiogroup" aria-label="Show" className="mb-4 grid grid-cols-2 p-1 bg-white border border-gray-200 rounded-2xl">
            {(
              [
                { key: 'transfers', label: 'Money in', badge: unmatched },
                { key: 'payouts', label: 'Withdrawals', badge: 0 },
              ] as const
            ).map((v) => (
              <button
                key={v.key}
                role="radio"
                aria-checked={moneyView === v.key}
                onClick={() => openTab('money', v.key)}
                className={`press min-h-10 rounded-xl text-[13px] font-bold inline-flex items-center justify-center gap-1.5 transition-colors ${
                  moneyView === v.key ? 'bg-ink text-volt-300' : 'text-gray-500 hover:text-ink'
                }`}
              >
                {v.label}
                {v.badge > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-sun-400 text-ink text-[10px] font-extrabold inline-flex items-center justify-center">
                    {v.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
          {moneyView === 'transfers' ? (
            <>
            {/* The account: the home's card when there is one, the set-up card when there isn't yet */}
            {billing && !billing.account ? (
              <GroupAccountCard
                groupId={id}
                groupName={group.name}
                fee={Number(group.feePerPlayer)}
                billing={billing}
                balance={money.balance?.available ?? null}
                onChange={money.setBilling}
                onMatchTransfer={(transferId) => setFocusTransfer(transferId)}
                showLink={false}
              />
            ) : (
              <div className="mb-3">
                <MoneyCard
                  group={group}
                  money={money}
                  gameFallback={null}
                  canManage={canManage}
                  showGame={false}
                  showTicker={false}
                  onScheduleGame={() => setShowCreateSession(true)}
                  onOpenAccount={() => setShowAccount(true)}
                />
              </div>
            )}
            <TransfersPanel
              groupId={id}
              fee={Number(group.feePerPlayer)}
              transfers={money.transfers ?? []}
              sessions={sessions}
              mockMode={billing?.providerMode === 'mock'}
              onRefresh={refreshPayments}
              focusId={focusTransfer}
              credits={Object.fromEntries((group.memberships ?? []).map((m) => [m.player.id, Number(m.credit ?? 0)]))}
            />
            </>
          ) : (
            <PayoutsPanel
              groupId={id}
              groupName={group.name}
              refundable={(group.memberships ?? [])
                .filter((m) => Number(m.credit ?? 0) > 0)
                .map((m) => ({ playerId: m.player.id, name: `${m.player.firstName} ${m.player.lastName}`, credit: Number(m.credit) }))}
              onRefresh={async () => {
                await refreshPayments();
                // A refund changes the member's credit.
                setGroup(await getGroup(id));
              }}
            />
          )}
        </div>
      )}

      {/* Members Tab */}
      {tab === 'members' && (
        <section aria-labelledby="squad-title">
          {/* Heading row like the home's sections: a plain title and one text action */}
          <div className="flex items-center justify-between">
            <div>
              <h2 id="squad-title" className="text-base font-bold text-ink">
                Squad
              </h2>
              {nextDue && <p className="text-xs text-gray-500">{perGame ? 'Payments for' : 'Dues for'} {dueLabel}</p>}
            </div>
            <button
              onClick={() => setShowAddMember(!showAddMember)}
              aria-expanded={showAddMember}
              className="h-11 -my-2 px-1 text-sm font-bold text-pitch-700"
            >
              {showAddMember ? 'Close' : 'Add player'}
            </button>
          </div>

          {showAddMember && (
            <div className="mt-2 bg-white rounded-3xl border border-gray-100 shadow-card p-4 animate-fade-in-up">
              {availablePlayers.length === 0 ? (
                <p className="text-sm text-gray-600">
                  Everyone you&apos;ve added is already here.{' '}
                  <Link href="/players/new" className="text-pitch-700 font-bold hover:underline">
                    Add a new player
                  </Link>{' '}
                  or send the invite link.
                </p>
              ) : (
                <div className="flex gap-2">
                  <select
                    value={selectedPlayerId}
                    onChange={(e) => setSelectedPlayerId(e.target.value)}
                    aria-label="Player to add"
                    className="flex-1 min-w-0 min-h-11 px-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-volt-300/70 focus:border-pitch-600"
                  >
                    <option value="">Pick one of your players</option>
                    {availablePlayers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.firstName} {p.lastName}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleAddMember}
                    disabled={!selectedPlayerId || addingMember}
                    className="shrink-0 min-h-11 px-4 bg-ink text-volt-300 text-sm font-bold rounded-xl hover:bg-pitch-900 disabled:opacity-40 transition-colors"
                  >
                    {addingMember ? 'Adding…' : 'Add'}
                  </button>
                </div>
              )}
            </div>
          )}

          {!group.memberships?.length ? (
            <div className="mt-2">
              <EmptyState icon="users" title="No one in the squad yet" description="Send the invite link to your group chat, or add players yourself." />
              {user && !imAMember && (
                <div className="mt-3 text-center">
                  <button onClick={handleAddMe} disabled={addingMe} className="h-11 px-3 text-sm font-bold text-pitch-700 disabled:opacity-50">
                    {addingMe ? 'Adding you…' : 'Playing too? Add yourself'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              {memberCount > 6 && (
                <div className="relative mt-2">
                  <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                  </svg>
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search name or nickname"
                    aria-label="Search the squad"
                    className="w-full pl-10 pr-3 py-3 bg-white border border-gray-200 rounded-2xl text-sm placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-volt-300/70 focus:border-pitch-600"
                  />
                </div>
              )}

              {/* Who's paid for the next game: the same filter style as the Sessions page */}
              {nextDue && (
                <div className="mt-3">
                  <div
                    role="radiogroup"
                    aria-label={`Show the squad by payment for ${dueLabel}`}
                    className="grid gap-2"
                    style={{ gridTemplateColumns: `repeat(${outCount > 0 ? 4 : 3}, minmax(0, 1fr))` }}
                  >
                    {(
                      [
                        { key: 'all', label: 'All', n: memberCount },
                        { key: 'owes', label: 'To pay', n: owesCount },
                        { key: 'paid', label: 'Paid', n: paidCount },
                        ...(outCount > 0 ? [{ key: 'out', label: 'Not in', n: outCount }] : []),
                      ] as { key: typeof memberFilter; label: string; n: number }[]
                    ).map((f) => (
                      <button
                        key={f.key}
                        role="radio"
                        aria-checked={memberFilter === f.key}
                        onClick={() => setMemberFilter(f.key)}
                        className={`h-10 px-1.5 text-[13px] font-bold rounded-full border whitespace-nowrap tabular-nums transition-colors ${
                          memberFilter === f.key ? 'bg-ink border-ink text-volt-300' : 'bg-white border-gray-200 text-gray-700 hover:border-ink'
                        }`}
                      >
                        {f.label} {f.n}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {shown.length === 0 && !(user && !imAMember && !q && memberFilter === 'all') ? (
                <p className="mt-6 text-sm text-gray-600 text-center">
                  {q
                    ? `No one called “${query.trim()}”.`
                    : memberFilter === 'owes'
                      ? `Everyone in for ${dueLabel} has paid.`
                      : memberFilter === 'out'
                        ? `Everyone is in for ${dueLabel}.`
                        : 'No one has paid yet.'}
                </p>
              ) : (
                <ul className="mt-2 bg-white rounded-3xl border border-gray-100 shadow-card divide-y divide-gray-100 overflow-hidden">
                  {/* The organiser plays too: a row like "Needs you", not a banner */}
                  {user && !imAMember && !q && memberFilter === 'all' && (
                    <li>
                      <button
                        onClick={handleAddMe}
                        disabled={addingMe}
                        className="w-full flex items-center gap-3 px-4 min-h-16 py-3 text-left hover:bg-chalk disabled:opacity-60 transition-colors"
                      >
                        <span className="w-10 h-10 rounded-xl bg-volt-300 text-ink flex items-center justify-center shrink-0" aria-hidden>
                          <PlusIcon />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-[15px] font-bold text-ink leading-snug">{addingMe ? 'Adding you…' : 'Add yourself'}</span>
                          <span className="block text-xs text-gray-500 mt-0.5 truncate">If you play in this group too</span>
                        </span>
                        <span className="shrink-0 text-sm font-bold text-pitch-700">Add me</span>
                      </button>
                    </li>
                  )}
                  {shown.map((m) => {
                    const name = `${m.player.firstName} ${m.player.lastName}`;
                    const kit = kitFor(name);
                    const credit = Number(m.credit ?? 0);
                    const st = m.due?.state;
                    const detail = [
                      isNew(m.joinedAt) && 'New this week',
                      m.player.nickname && `“${m.player.nickname}”`,
                      m.role !== 'player' && sentence(m.role),
                      credit > 0 && `${formatCurrency(credit)} credit`,
                    ].filter(Boolean) as string[];
                    return (
                      <li key={m.id}>
                        <button
                          onClick={() => setOpenMember(m.player.id)}
                          className="w-full flex items-center gap-3 px-4 min-h-16 py-3 text-left hover:bg-chalk transition-colors"
                        >
                          <span className={`w-10 h-10 shrink-0 rounded-full ${kit.bg} ${kit.fg} flex items-center justify-center text-sm font-extrabold font-display`} aria-hidden>
                            {m.player.firstName.charAt(0)}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-[15px] font-bold text-ink leading-snug truncate">{name}</span>
                            {detail.length > 0 && <span className="block text-xs text-gray-500 mt-0.5 truncate">{detail.join(', ')}</span>}
                          </span>
                          {/* Where they stand for that game, set like an amount in a bank list */}
                          {st && (
                            <span className="shrink-0 text-right">
                              {st === 'owes' ? (
                                <>
                                  <span className="block font-display text-[15px] font-extrabold text-amber-700 tabular-nums">{formatCurrency(m.due!.amount)}</span>
                                  <span className="block text-xs text-gray-500">To pay</span>
                                </>
                              ) : (
                                <span className={`block text-xs font-bold ${st === 'paid' ? 'text-pitch-600' : 'text-gray-400'}`}>
                                  {st === 'paid' ? 'Paid' : st === 'waived' ? 'Waived' : 'Not in'}
                                </span>
                              )}
                            </span>
                          )}
                          <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                          </svg>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </section>
      )}

      {/* Games Tab */}
      {tab === 'games' && (
        <div>
          <button onClick={() => setShowCreateSession(true)} className={`${btnSecondary} w-full mb-4`}>
            <PlusIcon />
            Schedule a game
          </button>
          {sessions.length === 0 ? (
            <EmptyState
              icon="calendar"
              title="No games yet"
              description={
                group.requireRsvp
                  ? 'Schedule one and players can say they’re in. Each player who’s in gets a due for it.'
                  : 'Schedule one and everyone in the group gets a due for it.'
              }
            />
          ) : (
            <>
              <GamesList sessions={sessions} targetPlayers={group.targetPlayers} kickoff={group.kickoffTime} />
              {gameTotal > sessions.length &&
                (gameLimit < 100 ? (
                  <button onClick={showOlderGames} disabled={loadingGames} className={`${btnSecondary} w-full mt-4`}>
                    {loadingGames ? 'Loading…' : `Show older games (${gameTotal - sessions.length} more)`}
                  </button>
                ) : (
                  <p className="mt-4 text-center text-sm text-gray-600">
                    Older games are on the{' '}
                    <Link href="/sessions" className="font-bold text-pitch-600 hover:underline">
                      Sessions page
                    </Link>
                    .
                  </p>
                ))}
            </>
          )}
        </div>
      )}
      </div>
      {showCreateSession && <NewSessionSheet groups={[group]} onClose={() => setShowCreateSession(false)} />}
    </div>
  );
}

/** The ⋯ menu: change the group's details, or delete it (behind a confirm). */
function GroupMenuSheet({
  name,
  onEdit,
  onDelete,
  onClose,
}: {
  name: string;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const row = 'press w-full flex items-center gap-3 min-h-12 px-2 py-1.5 rounded-xl text-left transition-colors';
  return (
    <Sheet titleId={titleId} onClose={onClose} align="left">
      <SheetTitle id={titleId} title={name} onClose={onClose} />
      <ul className="mt-3 -mx-2">
        <li>
          <button onClick={onEdit} className={`${row} hover:bg-chalk`}>
            <span className="w-8 h-8 shrink-0 rounded-lg bg-chalk text-ink flex items-center justify-center">{icon(ICON_PATHS.pencil)}</span>
            <span className="flex-1 text-[15px] font-semibold text-ink">Edit group details</span>
          </button>
        </li>
        <li>
            <button onClick={onDelete} className={`${row} hover:bg-kit-500/10`}>
              <span className="w-8 h-8 shrink-0 rounded-lg bg-kit-500/10 text-kit-600 flex items-center justify-center">
                <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
              </span>
              <span className="flex-1 text-[15px] font-semibold text-kit-600">Delete group</span>
            </button>
          </li>
      </ul>
    </Sheet>
  );
}
