'use client';

import { useEffect, useId, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Sheet } from '@/components/sheet';
import { stagger } from '@/components/motion';
import { SheetTitle } from '@/components/home/sheet-title';

export interface Update {
  key: string;
  href?: string;
  onClick?: () => void;
  title: string;
  detail?: string;
  icon: ReactNode;
  iconCls: string;
  /** Newest first within "Latest". */
  at?: number;
}

const SEEN_KEY = 'pitchaside_updates_seen';
const DAY = 86_400_000;

/**
 * The bell: things that need the organiser on top, then what's happened lately (money in, new
 * players). The count is what needs them plus anything new since they last opened it — remembered
 * on this phone only, until the server keeps track.
 */
export function UpdatesBell({ needs, latest }: { needs: Update[]; latest: Update[] }) {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [seenAt, setSeenAt] = useState(Infinity);
  useEffect(() => {
    try {
      // Never opened on this phone: only the last day counts as new, not everything ever.
      setSeenAt(Number(localStorage.getItem(SEEN_KEY)) || Date.now() - DAY);
    } catch {
      setSeenAt(Date.now() - DAY);
    }
  }, []);
  const fresh = latest.filter((u) => (u.at ?? 0) > seenAt).length;
  const count = needs.length + fresh;

  function openBell() {
    setOpen(true);
    const now = Date.now();
    try {
      localStorage.setItem(SEEN_KEY, String(now));
    } catch {
      // Not remembered; the badge just comes back next visit.
    }
    // Keep the "new" marks while it's open; clear them once closed.
    window.setTimeout(() => setSeenAt(now), 400);
  }

  return (
    <>
      <button
        onClick={openBell}
        aria-label={count ? `Updates, ${count} new` : 'Updates'}
        aria-haspopup="dialog"
        className="press relative w-11 h-11 shrink-0 rounded-full bg-white border border-gray-200 shadow-card flex items-center justify-center text-ink hover:border-ink transition-colors"
      >
        <svg className={`w-5 h-5 ${count ? 'origin-top animate-[ring_2.8s_ease-in-out_1s_2]' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
        </svg>
        {count > 0 && (
          <span className="animate-pop-in absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-kit-500 text-white text-[11px] font-extrabold flex items-center justify-center tabular-nums ring-2 ring-white">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <Sheet titleId={titleId} onClose={() => setOpen(false)} align="left">
          <SheetTitle id={titleId} title="Updates" onClose={() => setOpen(false)} />
          {needs.length === 0 && latest.length === 0 && <p className="mt-4 text-sm text-gray-600">All quiet. Nothing needs you right now.</p>}
          {needs.length > 0 && <Section title="Needs you" items={needs} seenAt={Infinity} onGo={() => setOpen(false)} />}
          {latest.length > 0 && <Section title="Latest" items={latest} seenAt={seenAt} onGo={() => setOpen(false)} />}
        </Sheet>
      )}
    </>
  );
}

function Section({ title, items, seenAt, onGo }: { title: string; items: Update[]; seenAt: number; onGo: () => void }) {
  return (
    <section className="mt-4">
      <h3 className="text-xs font-bold text-gray-600 mb-1">{title}</h3>
      <ul className="-mx-2">
        {items.map((u, i) => {
          const isNew = (u.at ?? 0) > seenAt;
          const body = (
            <>
              <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${u.iconCls}`}>{u.icon}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-bold text-ink leading-snug">{u.title}</span>
                {u.detail && <span className="block text-xs text-gray-600 mt-0.5 truncate">{u.detail}</span>}
              </span>
              {isNew && <span className="w-2 h-2 rounded-full bg-kit-500 shrink-0" aria-label="New" />}
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </>
          );
          const cls = 'press flex items-center gap-3 px-2 py-2.5 rounded-2xl text-left w-full hover:bg-chalk transition-colors';
          return (
            <li key={u.key} className="animate-rise" style={stagger(i, 40)}>
              {u.href ? (
                <Link href={u.href} onClick={onGo} className={cls}>
                  {body}
                </Link>
              ) : (
                <button
                  onClick={() => {
                    onGo();
                    u.onClick?.();
                  }}
                  className={cls}
                >
                  {body}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
