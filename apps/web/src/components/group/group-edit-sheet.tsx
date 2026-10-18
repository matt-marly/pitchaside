'use client';

import { useId, useState } from 'react';
import type { ContributionsVisibility } from '@pitchaside/shared';
import { Sheet } from '@/components/sheet';
import { SheetTitle } from '@/components/home/sheet-title';
import { btnPrimary } from '@/components/buttons';
import { RsvpToggle } from '@/components/rsvp-toggle';
import { ContributionsVisibilityPicker } from '@/components/contributions-visibility';
import { prettyTime } from '@/components/player-ui';
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

/** A native select with the field's padding and a chevron set in from the edge like the app's other icons. */
function Select({ id, value, onChange, children }: { id: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div className="relative">
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={`${field} appearance-none pr-11 cursor-pointer`}>
        {children}
      </select>
      <svg className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
      </svg>
    </div>
  );
}

/**
 * A number you nudge or type: − and + sit inside the one field, so it reads as a single control.
 * `prefix` shows a unit (₦) before the number; `format` shows it grouped while not being edited.
 */
function Stepper({
  id,
  value,
  onChange,
  step,
  min,
  prefix,
  labelledBy,
  less,
  more,
}: {
  id: string;
  value: number;
  onChange: (v: number) => void;
  step: number;
  min: number;
  prefix?: string;
  labelledBy: string;
  less: string;
  more: string;
}) {
  const btn =
    'w-12 shrink-0 flex items-center justify-center text-ink hover:bg-chalk disabled:text-gray-300 disabled:hover:bg-transparent transition-colors';
  return (
    <div className="flex h-12 rounded-xl border border-gray-200 bg-white overflow-hidden focus-within:ring-4 focus-within:ring-volt-300/70 focus-within:border-pitch-600">
      <button type="button" aria-label={less} disabled={value - step < min} onClick={() => onChange(Math.max(min, value - step))} className={`${btn} border-r border-gray-200`}>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.75} stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
        </svg>
      </button>
      <div className="flex-1 min-w-0 flex items-center justify-center gap-0.5">
        {prefix && (
          <span className="font-display text-lg font-extrabold text-gray-400" aria-hidden>
            {prefix}
          </span>
        )}
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          step={step}
          aria-labelledby={labelledBy}
          value={Number.isFinite(value) ? value : ''}
          onChange={(e) => onChange(Math.max(0, Math.round(Number(e.target.value))))}
          style={{ width: `${Math.max(2, String(Number.isFinite(value) ? value : '').length) + 1}ch` }}
          className="min-w-0 bg-transparent text-center font-display text-lg font-extrabold text-ink tabular-nums focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
      </div>
      <button type="button" aria-label={more} onClick={() => onChange(value + step)} className={`${btn} border-l border-gray-200`}>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.75} stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m7-7H5" />
        </svg>
      </button>
    </div>
  );
}

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
            rows={2}
            value={d.description}
            onChange={(e) => set({ description: e.target.value })}
            placeholder="e.g. Friendly 5-a-side, all levels welcome"
            className={`${field} py-3 leading-snug resize-none`}
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
          <Select id="g-time" value={d.kickoffTime.slice(0, 5)} onChange={(v) => set({ kickoffTime: v })}>
            <option value="">Not set</option>
            {times.map((t) => (
              <option key={t} value={t}>
                {prettyTime(t)}
              </option>
            ))}
          </Select>
        </div>

        {/* Players and money */}
        <div>
          <span className={label} id="g-players-label">
            Players per game
          </span>
          <Stepper
            id="g-players"
            labelledBy="g-players-label"
            value={d.targetPlayers}
            onChange={(v) => set({ targetPlayers: v })}
            step={1}
            min={2}
            less="One fewer player"
            more="One more player"
          />
          <p className="mt-1.5 text-xs text-gray-500">The squad can be bigger; this is how many play each game.</p>
        </div>
        <div>
          <span id="g-fee-label" className={label}>
            Fee per player
          </span>
          <Stepper
            id="g-fee"
            labelledBy="g-fee-label"
            value={d.feePerPlayer}
            onChange={(v) => set({ feePerPlayer: v })}
            step={500}
            min={0}
            prefix="₦"
            less="₦500 less"
            more="₦500 more"
          />
          <p className="mt-1.5 text-xs text-gray-500">Steps of ₦500, or type any amount.</p>
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

