'use client';

import type { ReactNode } from 'react';
import { stagger } from '@/components/motion';

export interface QuickAction {
  key: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
}

/**
 * A row of the things organisers reach for most, each an icon with its name under it (never an
 * icon on its own). They open sheets, so the home page stays short.
 */
export function QuickActions({ actions }: { actions: QuickAction[] }) {
  if (!actions.length) return null;
  return (
    <nav aria-label="Quick actions" className="mt-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${actions.length}, minmax(0, 1fr))` }}>
      {actions.map((a, i) => (
        <button
          key={a.key}
          onClick={a.onClick}
          style={stagger(i, 50, 250)}
          className="press animate-rise group flex flex-col items-center justify-center gap-1.5 min-h-[76px] rounded-2xl bg-white border border-gray-200 shadow-card px-2 py-2.5 hover:border-ink transition-colors"
        >
          <span className="w-9 h-9 rounded-full bg-volt-300 text-ink flex items-center justify-center transition-transform group-hover:-translate-y-0.5">
            {a.icon}
          </span>
          <span className="text-[12px] font-bold text-ink leading-tight text-center">{a.label}</span>
        </button>
      ))}
    </nav>
  );
}

export const InviteIcon = () => (
  <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
  </svg>
);

export const BankShareIcon = () => (
  <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z" />
  </svg>
);

export const CalendarPlusIcon = () => (
  <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6v4.5m-2.25-2.25h4.5" />
  </svg>
);
