'use client';

import { useEffect, useState, type ReactNode } from 'react';

/**
 * A yes/no remembered on this phone (which home sections are folded, for instance). Starts as
 * `initial` until storage has been read; blocked storage just means it isn't remembered.
 */
export function useRemembered(key: string, initial: boolean) {
  const [value, setValue] = useState(initial);
  useEffect(() => {
    try {
      const v = localStorage.getItem(key);
      if (v === '1' || v === '0') setValue(v === '1');
    } catch {
      // Not remembered; the default stands.
    }
  }, [key]);
  const toggle = () =>
    setValue((v) => {
      try {
        localStorage.setItem(key, v ? '0' : '1');
      } catch {
        // Still toggles for now.
      }
      return !v;
    });
  return [value, toggle] as const;
}

/**
 * Content that folds away smoothly. Folded, it's taken out of the tab order and hidden from
 * screen readers too (`inert`), so nobody tabs into something they can't see.
 */
export function Collapse({ open, id, children }: { open: boolean; id: string; children: ReactNode }) {
  return (
    <div
      id={id}
      inert={!open}
      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
        open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
      }`}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

/** The round arrow button that folds a section; says what it does to screen readers. */
export function CollapseButton({
  open,
  onClick,
  controls,
  label,
  onDark = false,
}: {
  open: boolean;
  onClick: () => void;
  controls: string;
  /** What's being folded, e.g. "account". */
  label: string;
  onDark?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-expanded={open}
      aria-controls={controls}
      aria-label={open ? `Hide ${label}` : `Show ${label}`}
      className={`press w-11 h-11 -my-2 -mr-2 shrink-0 flex items-center justify-center rounded-full transition-colors ${
        onDark ? 'text-white/80 hover:bg-white/10 hover:text-white' : 'text-ink hover:bg-chalk'
      }`}
    >
      <span className={`w-8 h-8 rounded-full flex items-center justify-center ${onDark ? 'bg-white/10' : 'bg-chalk'}`}>
        <svg
          className={`w-4 h-4 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.75}
          stroke="currentColor"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </span>
    </button>
  );
}
