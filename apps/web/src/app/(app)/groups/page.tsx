'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { EmptyState } from '@/components/empty-state';
import { Pagination } from '@/components/pagination';
import { useToast } from '@/components/toast';
import { PageHeader } from '@/components/brand';
import { JerseyBadge } from '@/components/illustrations';
import { frequencyShort } from '@/lib/billing';
import { getGroupsPaginated, exportGroupsCsv, formatCurrency, type IGroupWithMembers, type PaginatedResponse } from '@/lib/api';

export default function GroupsPage() {
  const toast = useToast();
  const [groups, setGroups] = useState<IGroupWithMembers[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  function fetchGroups(p = page) {
    return getGroupsPaginated(p, 10)
      .then((res) => {
        setGroups(res.data);
        setMeta(res.meta);
      })
      .catch(() => {});
  }

  useEffect(() => {
    fetchGroups(page).finally(() => setLoading(false));
  }, [page]);

  function handlePageChange(p: number) {
    setPage(p);
    setLoading(true);
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <div className="animate-pulse" aria-busy="true" aria-label="Loading groups">
          <div className="h-4 bg-gray-100 rounded w-24" />
          <div className="mt-2 h-8 bg-gray-100 rounded w-32" />
          <div className="mt-6 h-40 bg-gray-100 rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <PageHeader
        eyebrow="Your squads"
        title="Groups"
        subtitle={meta.total > 0 ? `${meta.total} group${meta.total === 1 ? '' : 's'} on the books` : undefined}
        actions={
        <>
          {meta.total > 0 && (
            <button
              onClick={() => exportGroupsCsv().catch(() => toast.error('Export failed'))}
              className="p-2.5 text-gray-500 bg-white border border-gray-200 rounded-xl hover:text-ink hover:border-gray-300 transition-colors"
              title="Export CSV"
              aria-label="Download groups as a spreadsheet (CSV)"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
            </button>
          )}
          <Link
            href="/groups/new"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-ink text-volt-300 text-sm font-bold rounded-xl hover:bg-pitch-900 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New group
          </Link>
        </>
        }
      />

      {groups.length === 0 && meta.total === 0 ? (
        <EmptyState
          icon="users"
          title="Your first group starts here"
          description="Create a football group to start tracking players, games, and payments."
          actionLabel="Create a group"
          actionHref="/groups/new"
        />
      ) : (
        <>
          {/* One card of rows, like the home's lists. No "16/28 full": membership has no cap (the
              limit is per game, shown on the group). Deleting lives in each group's ⋯ menu. */}
          <ul className="bg-white rounded-3xl border border-gray-100 shadow-card divide-y divide-gray-100 overflow-hidden">
            {groups.map((group) => {
              const memberCount = group.memberships?.length || 0;
              const where = [group.location, group.schedule].filter(Boolean).join(', ');
              return (
                <li key={group.id}>
                  <Link href={`/groups/${group.id}`} className="flex items-center gap-3 px-4 min-h-[76px] py-3 hover:bg-chalk transition-colors">
                    <JerseyBadge label={group.name.charAt(0).toUpperCase()} name={group.name} className="w-11 h-11 shrink-0" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-[15px] font-bold text-ink leading-snug truncate">{group.name}</span>
                      <span className="block text-xs text-gray-600 mt-0.5 tabular-nums">
                        {memberCount} member{memberCount === 1 ? '' : 's'}, {formatCurrency(group.feePerPlayer)} {frequencyShort(group.paymentType) || 'per game'}
                      </span>
                      {!group.accountNumber ? (
                        <span className="block text-xs font-semibold text-amber-700 mt-0.5">No bank account yet</span>
                      ) : (
                        where && <span className="block text-xs text-gray-500 mt-0.5 truncate">{where}</span>
                      )}
                    </span>
                    <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
                  </Link>
                </li>
              );
            })}
          </ul>
          <Pagination
            page={meta.page}
            totalPages={meta.totalPages}
            total={meta.total}
            limit={meta.limit}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </div>
  );
}
