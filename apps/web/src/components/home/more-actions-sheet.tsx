'use client';

import { useId, type CSSProperties, type ReactNode } from 'react';
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
 * Everything an organiser does less often than weekly, grouped the way they think about it
 * (money, players, games, the group). Each one goes straight to where it gets done.
 */
export function MoreActionsSheet({ sections, onClose }: { sections: { title: string; actions: MoreAction[] }[]; onClose: () => void }) {
  const titleId = useId();
  return (
    <Sheet titleId={titleId} onClose={onClose} align="left">
      <SheetTitle id={titleId} title="More actions" onClose={onClose} />
      {sections
        .filter((s) => s.actions.length)
        .map((s, si) => (
          <section key={s.title} className="mt-5">
            <h3 className="text-xs font-bold text-gray-600 mb-2">{s.title}</h3>
            <div className="grid grid-cols-2 gap-2">
              {s.actions.map((a, i) => (
                <ActionTile key={a.key} action={a} style={stagger(si * 2 + i, 30)} onDone={onClose} />
              ))}
            </div>
          </section>
        ))}
    </Sheet>
  );
}

function ActionTile({ action, style, onDone }: { action: MoreAction; style: CSSProperties; onDone: () => void }) {
  const cls =
    'press animate-rise flex items-center gap-2.5 min-h-14 rounded-2xl bg-chalk border border-transparent px-3 py-2.5 text-left text-sm font-bold text-ink hover:border-ink transition-colors';
  const body = (
    <>
      <span className="w-8 h-8 shrink-0 rounded-xl bg-white text-ink flex items-center justify-center shadow-card">{action.icon}</span>
      <span className="leading-tight">{action.label}</span>
    </>
  );
  if (action.href) {
    return (
      <Link href={action.href} onClick={onDone} className={cls} style={style}>
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
      style={style}
    >
      {body}
    </button>
  );
}
