'use client';

import { useId, type ReactNode } from 'react';
import Link from 'next/link';
import { Sheet } from '@/components/sheet';
import { stagger } from '@/components/motion';
import { SheetTitle } from '@/components/home/sheet-title';

export interface MoreAction {
  key: string;
  label: string;
  icon: ReactNode;
  href?: string;
  onClick?: () => void;
}

/**
 * Everything an organiser does less often than weekly, as compact rows under short headings
 * (money, games, players, the group). Each row goes straight to where it gets done.
 */
export function MoreActionsSheet({ sections, onClose }: { sections: { title: string; actions: MoreAction[] }[]; onClose: () => void }) {
  const titleId = useId();
  let n = 0;
  return (
    <Sheet titleId={titleId} onClose={onClose} align="left">
      <SheetTitle id={titleId} title="More actions" onClose={onClose} />
      <div className="mt-2 -mx-2">
        {sections
          .filter((s) => s.actions.length)
          .map((s) => (
            <section key={s.title} className="mt-3 first:mt-1">
              <h3 className="px-2 mb-0.5 text-[11px] font-bold uppercase tracking-[0.1em] text-gray-600">{s.title}</h3>
              <ul>
                {s.actions.map((a) => (
                  <li key={a.key} className="animate-rise" style={stagger(n++, 25)}>
                    <ActionRow action={a} onDone={onClose} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
      </div>
    </Sheet>
  );
}

function ActionRow({ action, onDone }: { action: MoreAction; onDone: () => void }) {
  const cls = 'press w-full flex items-center gap-3 min-h-12 px-2 py-1.5 rounded-xl text-left hover:bg-chalk transition-colors';
  const body = (
    <>
      <span className="w-8 h-8 shrink-0 rounded-lg bg-chalk text-ink flex items-center justify-center">{action.icon}</span>
      <span className="flex-1 min-w-0 text-[15px] font-semibold text-ink truncate">{action.label}</span>
      <svg className="w-4 h-4 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
      </svg>
    </>
  );
  if (action.href) {
    return (
      <Link href={action.href} onClick={onDone} className={cls}>
        {body}
      </Link>
    );
  }
  return (
    <button
      onClick={() => {
        // Close this sheet first, then open whatever the action starts.
        onDone();
        action.onClick?.();
      }}
      className={cls}
    >
      {body}
    </button>
  );
}
