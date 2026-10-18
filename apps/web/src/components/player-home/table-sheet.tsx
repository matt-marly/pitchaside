'use client';

import { useState } from 'react';
import { Avatar } from '@/components/ratings';
import { Sheet } from '@/components/sheet';
import type { PlayerHome } from '@/lib/player';

/** "See the table": a chip that opens each group's top five (plus you) in a sheet. */
export function TableChip({ tables, myName }: { tables: PlayerHome['tables']; myName: string }) {
  const [open, setOpen] = useState(false);
  const shown = tables.filter((t) => t.top.some((row) => row.points > 0));
  if (!shown.length) return null;
  const mine = shown.find((t) => t.me)?.me;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex min-h-[52px] items-center justify-between gap-3 rounded-2xl bg-white border border-gray-200 shadow-card px-4 text-left hover:border-ink"
      >
        <span className="text-sm font-bold text-ink">See the table</span>
        <span className="text-sm font-semibold text-gray-600 tabular-nums">
          {mine ? `You’re #${mine.rank} · ${mine.points} pts` : ''} <span aria-hidden>›</span>
        </span>
      </button>

      {open && (
        <Sheet titleId="home-table" align="left" onClose={() => setOpen(false)}>
          <h2 id="home-table" className="font-display text-xl font-extrabold text-ink mb-3">
            The table
          </h2>
          <div className="space-y-3">
            {shown.map((t) => (
              <div key={t.groupId} className="bg-white rounded-3xl border border-gray-100 shadow-card overflow-hidden">
                <p className="px-4 py-2.5 bg-ink text-xs font-bold text-white/70">{t.groupName}</p>
                {t.top.map((row) => (
                  <div
                    key={row.id}
                    className={`flex items-center gap-3 px-4 py-2.5 border-t border-gray-100 ${row.id === t.myPlayerId ? 'bg-volt-100' : ''}`}
                  >
                    <span className="w-5 text-xs font-extrabold text-gray-600 tabular-nums">{row.rank}</span>
                    <Avatar name={row.name} className="w-7 h-7 text-[10px]" />
                    <span className="flex-1 text-sm font-bold text-ink truncate">{row.id === t.myPlayerId ? 'You' : row.name}</span>
                    <span className="font-display font-extrabold text-ink tabular-nums">{row.points}</span>
                  </div>
                ))}
                {t.me && t.me.rank > t.top.length && (
                  <div className="flex items-center gap-3 px-4 py-2.5 border-t border-dashed border-gray-200 bg-volt-100">
                    <span className="w-5 text-xs font-extrabold text-gray-600 tabular-nums">{t.me.rank}</span>
                    <Avatar name={myName} className="w-7 h-7 text-[10px]" />
                    <span className="flex-1 text-sm font-bold text-ink">You</span>
                    <span className="font-display font-extrabold text-ink tabular-nums">{t.me.points}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          <button onClick={() => setOpen(false)} className="mt-4 w-full min-h-12 rounded-xl bg-gray-100 text-sm font-bold text-gray-700 hover:bg-gray-200">
            Done
          </button>
        </Sheet>
      )}
    </>
  );
}
