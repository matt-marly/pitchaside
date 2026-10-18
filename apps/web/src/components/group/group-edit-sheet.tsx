'use client';

import { useId, useState } from 'react';
import type { ContributionsVisibility } from '@pitchaside/shared';
import { Sheet } from '@/components/sheet';
import { SheetTitle } from '@/components/home/sheet-title';
import { btnPrimary } from '@/components/buttons';
import { RsvpToggle } from '@/components/rsvp-toggle';
import { ContributionsVisibilityPicker } from '@/components/contributions-visibility';
import { prettyTime } from '@/components/player-ui';
import { formatCurrency } from '@/lib/api';
import { frequencyOptions } from '@/lib/billing';

export interface GroupEditData {
  name: string;
  description: string;
  location: string;
  schedule: string;
  kickoffTime: string;
  targetPlayers: number;
  feePerPlayer: number;
  paymentType: string;
  requireRsvp: boolean;
  contributionsVisibility: ContributionsVisibility;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const FEES = [1000, 1500, 2000, 2500, 3000];
// Kick-off times on the half hour, early morning to late evening.
const TIMES = Array.from({ length: 37 }, (_, i) => {
  const mins = 5 * 60 + i * 30;
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
});

const label = 'block text-xs font-bold text-gray-700 mb-1.5';
const field =
  'w-full min-h-12 px-3.5 bg-white border border-gray-200 rounded-xl text-[15px] placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-volt-300/70 focus:border-pitch-600';
const chip = (on: boolean) =>
  `h-10 px-3 rounded-full border text-[13px] font-bold whitespace-nowrap transition-colors ${
    on ? 'bg-ink border-ink text-volt-300' : 'bg-white border-gray-200 text-gray-700 hover:border-ink'
  }`;

/** "Every Saturday" → "Saturday"; anything else is a custom schedule. */
function dayOf(schedule: string) {
  const m = /^every\s+(\w+)$/i.exec(schedule.trim());
  const d = m && DAYS.find((x) => x.toLowerCase() === m[1].toLowerCase());
  return d ?? (schedule.trim() ? 'other' : '');
}

/**
 * Changing a group's details, as a sheet like the rest of the app: tap to pick wherever there's a
 * short list (game day, kick-off, how players pay, common fees), steppers for numbers, and an
 * example in every empty field. Saves with the same update call as before.
 */
export function GroupEditSheet({
  initial,
  saving,
  onSave,
  onClose,
}: {
  initial: GroupEditData;
  saving: boolean;
  onSave: (data: GroupEditData) => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const [d, setD] = useState<GroupEditData>({ ...initial, feePerPlayer: Math.round(Number(initial.feePerPlayer)) });
  const [day, setDay] = useState(() => dayOf(initial.schedule));
  const set = (patch: Partial<GroupEditData>) => setD((x) => ({ ...x, ...patch }));
  const times = d.kickoffTime && !TIMES.includes(d.kickoffTime.slice(0, 5)) ? [d.kickoffTime.slice(0, 5), ...TIMES] : TIMES;
  const valid = d.name.trim().length > 0 && d.targetPlayers >= 2 && d.feePerPlayer >= 0;
  const freq = frequencyOptions.find((o) => o.value === d.paymentType);

  function pickDay(v: string) {
    setDay(v);
    if (v === 'other') set({ schedule: dayOf(initial.schedule) === 'other' ? initial.schedule : '' });
    else set({ schedule: v ? `Every ${v}` : '' });
  }

  return (
    <Sheet
      titleId={titleId}
      onClose={onClose}
      align="left"
      footer={
        <button onClick={() => onSave(d)} disabled={!valid || saving} className={`${btnPrimary} w-full disabled:opacity-40`}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      }
    >
      <SheetTitle id={titleId} title="Edit group" sub="Players see the name, pitch, day and fee." onClose={onClose} />

      <div className="mt-5 space-y-5">
        {/* The group */}
        <div>
          <label htmlFor="g-name" className={label}>
            Group name
          </label>
          <input id="g-name" value={d.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Saturday Ballers" className={field} />
        </div>
        <div>
          <label htmlFor="g-desc" className={label}>
            Description <span className="font-semibold text-gray-500">(optional)</span>
          </label>
          <textarea
            id="g-desc"
            rows={3}
            value={d.description}
            onChange={(e) => set({ description: e.target.value })}
            placeholder="e.g. Friendly 5-a-side, all levels welcome. Bring a white and a dark top."
            className={`${field} py-3 resize-none`}
          />
        </div>
        <div>
          <label htmlFor="g-pitch" className={label}>
            Pitch
          </label>
          <input
            id="g-pitch"
            value={d.location}
            onChange={(e) => set({ location: e.target.value })}
            placeholder="e.g. Teslim Balogun Stadium, Surulere"
            className={field}
          />
        </div>

        {/* When */}
        <fieldset>
          <legend className={label}>Game day</legend>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((x) => (
              <button key={x} type="button" aria-pressed={day === x} onClick={() => pickDay(x)} className={chip(day === x)}>
                {x.slice(0, 3)}
              </button>
            ))}
            <button type="button" aria-pressed={day === 'other'} onClick={() => pickDay('other')} className={chip(day === 'other')}>
              Other
            </button>
          </div>
          {day === 'other' && (
            <input
              aria-label="Schedule"
              value={d.schedule}
              onChange={(e) => set({ schedule: e.target.value })}
              placeholder="e.g. Every other Sunday"
              className={`${field} mt-2`}
            />
          )}
        </fieldset>
        <div>
          <label htmlFor="g-time" className={label}>
            Kick-off
          </label>
          <select id="g-time" value={d.kickoffTime.slice(0, 5)} onChange={(e) => set({ kickoffTime: e.target.value })} className={field}>
            <option value="">Not set</option>
            {times.map((t) => (
              <option key={t} value={t}>
                {prettyTime(t)}
              </option>
            ))}
          </select>
        </div>

        {/* Players and money */}
        <div>
          <span className={label} id="g-players-label">
            Players per game
          </span>
          <div className="flex items-center gap-3" role="group" aria-labelledby="g-players-label">
            <button
              type="button"
              onClick={() => set({ targetPlayers: Math.max(2, d.targetPlayers - 1) })}
              aria-label="One fewer player"
              className="w-12 h-12 shrink-0 rounded-xl border border-gray-200 bg-white text-xl font-bold text-ink hover:border-ink"
            >
              −
            </button>
            <input
              type="number"
              inputMode="numeric"
              min={2}
              aria-labelledby="g-players-label"
              value={d.targetPlayers}
              onChange={(e) => set({ targetPlayers: Math.max(0, Math.round(Number(e.target.value))) })}
              className={`${field} text-center font-display text-lg font-extrabold tabular-nums`}
            />
            <button
              type="button"
              onClick={() => set({ targetPlayers: d.targetPlayers + 1 })}
              aria-label="One more player"
              className="w-12 h-12 shrink-0 rounded-xl border border-gray-200 bg-white text-xl font-bold text-ink hover:border-ink"
            >
              +
            </button>
          </div>
          <p className="mt-1.5 text-xs text-gray-500">The squad can be bigger; this is how many play each game.</p>
        </div>
        <div>
          <label htmlFor="g-fee" className={label}>
            Fee per player
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] font-bold text-gray-500" aria-hidden>
              ₦
            </span>
            <input
              id="g-fee"
              type="number"
              inputMode="numeric"
              min={0}
              value={d.feePerPlayer || ''}
              onChange={(e) => set({ feePerPlayer: Math.max(0, Math.round(Number(e.target.value))) })}
              placeholder="1500"
              className={`${field} pl-8 tabular-nums`}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {FEES.map((f) => (
              <button key={f} type="button" aria-pressed={d.feePerPlayer === f} onClick={() => set({ feePerPlayer: f })} className={chip(d.feePerPlayer === f)}>
                {formatCurrency(f)}
              </button>
            ))}
          </div>
        </div>
        <fieldset>
          <legend className={label}>How players pay</legend>
          <div className="flex flex-wrap gap-2">
            {frequencyOptions.map((o) => (
              <button
                key={o.value}
                type="button"
                aria-pressed={d.paymentType === o.value}
                onClick={() => set({ paymentType: o.value })}
                className={chip(d.paymentType === o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>
          {freq && <p className="mt-1.5 text-xs text-gray-500">{freq.hint}</p>}
        </fieldset>

        {/* How games and money show to players */}
        <RsvpToggle checked={d.requireRsvp} onChange={(v) => set({ requireRsvp: v })} />
        <ContributionsVisibilityPicker value={d.contributionsVisibility} onChange={(v) => set({ contributionsVisibility: v })} />
      </div>
    </Sheet>
  );
}

