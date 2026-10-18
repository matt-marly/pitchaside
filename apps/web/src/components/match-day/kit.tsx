'use client';

import type { Lineup, TeamKey } from '@/lib/api';

/**
 * Bib colours for each side. `text` is what reads on the swatch: ink on all of them, since
 * white on orange, blue, green and red is too faint to read outdoors (under 4.5:1).
 */
export const TEAMS: Record<TeamKey, { name: string; swatch: string; soft: string; text: string }> = {
  A: { name: 'Orange', swatch: 'bg-kit-500', soft: 'bg-kit-400/15', text: 'text-ink' },
  B: { name: 'Yellow', swatch: 'bg-sun-400', soft: 'bg-sun-400/20', text: 'text-ink' },
  C: { name: 'Blue', swatch: 'bg-[#3b82f6]', soft: 'bg-[#3b82f6]/10', text: 'text-ink' },
  D: { name: 'White', swatch: 'bg-white border border-ink', soft: 'bg-chalk', text: 'text-ink' },
  E: { name: 'Green', swatch: 'bg-pitch-500', soft: 'bg-pitch-500/10', text: 'text-ink' },
  F: { name: 'Red', swatch: 'bg-[#e5484d]', soft: 'bg-[#e5484d]/10', text: 'text-ink' },
};

/** A side goes by its captain once it has one ("Team Baba"), else its bib colour. */
export function teamName(team: TeamKey, captains?: Partial<Record<TeamKey, string>>) {
  const captain = captains?.[team];
  return captain ? `Team ${captain}` : TEAMS[team].name;
}

export type Squad = Lineup['squad'];
export type SquadMember = Squad[number];

export const TEAM_KEYS = Object.keys(TEAMS) as TeamKey[];

/** Bib colours as hex, for the SVG shirts (same colours as TEAMS' swatches). Numbers print in ink to stay readable. */
export const BIB: Record<TeamKey, { fill: string; ink: string }> = {
  A: { fill: '#ff6a3d', ink: '#0f1a14' },
  B: { fill: '#ffc93c', ink: '#0f1a14' },
  C: { fill: '#3b82f6', ink: '#0f1a14' },
  D: { fill: '#ffffff', ink: '#0f1a14' },
  E: { fill: '#2f8f48', ink: '#0f1a14' },
  F: { fill: '#e5484d', ink: '#0f1a14' },
};

/** For screen readers once a side is named after its captain: "Team Baba, orange bib". */
export function teamWithBib(team: TeamKey, captains?: Partial<Record<TeamKey, string>>) {
  const name = teamName(team, captains);
  return captains?.[team] ? `${name}, ${TEAMS[team].name.toLowerCase()} bib` : `${name} bib`;
}

/** Same shirt outline as the session hero's squad board. */
const SHIRT = 'M14 6 L19 4 Q24 8 29 4 L34 6 L45 13 L40 22 L35 19 L35 44 L13 44 L13 19 L8 22 L3 13 Z';

/**
 * A bib. With no team it's an empty dashed shirt (nobody's put one on yet). `label` is printed on
 * the front like a shirt number: a count on the rack, a player's initial in the list.
 */
export function Shirt({
  team,
  label,
  className = 'w-9 h-9',
  onDark = false,
}: {
  team: TeamKey | null;
  label?: string | number;
  className?: string;
  onDark?: boolean;
}) {
  const bib = team ? BIB[team] : null;
  const big = String(label ?? '').length > 1;
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path
        d={SHIRT}
        fill={bib ? bib.fill : 'transparent'}
        stroke={bib ? (team === 'D' || !onDark ? '#0f1a14' : 'transparent') : onDark ? 'rgba(255,255,255,0.45)' : '#a8a493'}
        strokeOpacity={bib && !onDark ? (team === 'D' ? 0.55 : 0.18) : 1}
        strokeWidth={bib ? 2 : 2.5}
        strokeDasharray={bib ? undefined : '4 3'}
        strokeLinejoin="round"
      />
      {label !== undefined && (
        <text
          x="24"
          y={big ? 34 : 35}
          textAnchor="middle"
          fontSize={big ? 15 : 17}
          fontWeight="800"
          fontFamily="var(--font-heading), sans-serif"
          fill={bib ? bib.ink : onDark ? 'rgba(255,255,255,0.8)' : '#6b6857'}
        >
          {label}
        </text>
      )}
    </svg>
  );
}

/** The armband: a small volt band with a C. */
export function Armband({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center h-5 px-1.5 rounded-md bg-volt-400 text-ink text-[10px] font-extrabold leading-none border border-ink shrink-0 ${className}`}
      title="Captain"
    >
      <span aria-hidden>C</span>
      <span className="sr-only">Captain</span>
    </span>
  );
}

/** On a team sheet: their nickname, else their first name. */
export const pitchName = (m: { firstName: string; nickname?: string | null }) => m.nickname || m.firstName;

/** Average OVR of a side, or null when nobody on it is rated. */
export function avgOf(squad: Squad, team: TeamKey) {
  const rated = squad.filter((m) => m.team === team && m.ovr != null);
  return rated.length ? Math.round(rated.reduce((s, m) => s + (m.ovr ?? 0), 0) / rated.length) : null;
}

/** "Paid" marks as on the old team builder: a tick, or an orange dot for not paid yet. */
export function PaidMark({ paid }: { paid?: SquadMember['paid'] }) {
  if (paid === 'paid') {
    return (
      <span className="text-[11px] font-extrabold text-pitch-600" title="Paid for this game">
        ✓<span className="sr-only"> Paid</span>
      </span>
    );
  }
  if (paid === 'unpaid') {
    return (
      <span className="w-2 h-2 rounded-full bg-kit-600 shrink-0" title="Hasn't paid for this game">
        <span className="sr-only">Hasn&apos;t paid</span>
      </span>
    );
  }
  return null;
}
