/** Title row for the home page's sheets: a heading, an optional line under it, and a close button. */
export function SheetTitle({ id, title, sub, onClose }: { id: string; title: string; sub?: string; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 id={id} className="font-display text-xl font-extrabold text-ink leading-tight">
          {title}
        </h2>
        {sub && <p className="text-xs text-gray-600 mt-0.5 truncate">{sub}</p>}
      </div>
      <button
        onClick={onClose}
        aria-label="Close"
        className="w-11 h-11 -mt-2 -mr-2 shrink-0 flex items-center justify-center rounded-full text-gray-500 hover:bg-chalk hover:text-ink"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
