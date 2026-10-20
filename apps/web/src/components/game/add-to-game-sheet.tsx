'use client';

import { useId, useState } from 'react';
import { Sheet } from '@/components/sheet';
import { SheetTitle } from '@/components/home/sheet-title';
import { Avatar } from '@/components/ratings';
import { stagger } from '@/components/motion';

export type GroupMember = { playerId: string; name: string; nickname?: string | null; photoKey?: string | null };

/**
 * Putting group members on a game by hand, for players who told the organiser rather than the
 * app. Everyone in the group who isn't on the game yet, searchable, one tap each.
 */
export function AddToGameSheet({
  members,
  onAdd,
  onClose,
}: {
  /** Group members not on this game yet. */
  members: GroupMember[];
  onAdd: (m: GroupMember) => Promise<void>;
  onClose: () => void;
}) {
  const titleId = useId();
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const q = query.trim().toLowerCase();
  // Search by name or nickname: organisers often know players by the nickname.
  const shown = members.filter((m) => !q || `${m.name} ${m.nickname ?? ''}`.toLowerCase().includes(q));

  async function add(m: GroupMember) {
    setBusy(m.playerId);
    try {
      await onAdd(m);
      setAdded((prev) => new Set(prev).add(m.playerId));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Sheet titleId={titleId} onClose={onClose} align="left">
      <SheetTitle id={titleId} title="Add players to this game" sub="For players who told you they’re in. They’ll owe for it like anyone else." onClose={onClose} />
      {/* Stays at the top of the sheet while the list scrolls under it */}
      {members.length > 8 && (
        <div className="sticky top-0 z-10 -mx-6 px-6 pt-5 pb-2 mt-1 bg-white">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find a player"
          aria-label="Find a player"
          className="w-full h-11 px-3.5 bg-chalk rounded-xl text-[15px] placeholder:text-gray-500 focus:outline-none focus:bg-white focus:ring-4 focus:ring-volt-300/70"
        />
        </div>
      )}
      {shown.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">{members.length ? `No one called “${query.trim()}”.` : 'Everyone in the group is on this game.'}</p>
      ) : (
        <ul className="mt-2 rounded-3xl bg-white border border-gray-100 divide-y divide-gray-100 overflow-hidden">
          {shown.map((m, i) => {
            const isIn = added.has(m.playerId);
            return (
              <li key={m.playerId} className="animate-rise flex items-center gap-3 px-3.5 min-h-16 py-2.5" style={stagger(Math.min(i, 10), 25, 0)}>
                <Avatar name={m.name} photoKey={m.photoKey} className="w-10 h-10 text-sm" />
                <span className="flex-1 min-w-0">
                  <span className="block text-[15px] font-bold text-ink truncate">{m.name}</span>
                  {m.nickname && <span className="block text-[13px] text-gray-500 truncate">“{m.nickname}”</span>}
                </span>
                {/* Quiet until tapped: a list of loud buttons would all shout at once */}
                <button
                  onClick={() => add(m)}
                  disabled={isIn || busy === m.playerId}
                  aria-label={isIn ? `${m.name} is in` : `Mark ${m.name} in`}
                  className={`press shrink-0 min-h-11 px-4 rounded-full text-[13px] font-bold transition-colors disabled:cursor-default ${
                    isIn ? 'bg-volt-300 text-ink animate-pop-in' : 'border border-gray-300 bg-white text-ink hover:border-ink'
                  }`}
                >
                  {isIn ? 'In ✓' : busy === m.playerId ? '…' : 'Mark in'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Sheet>
  );
}
