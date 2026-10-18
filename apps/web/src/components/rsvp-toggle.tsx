'use client';

/** "Players confirm each game" switch used on the create and edit group forms. */
export function RsvpToggle({
  checked,
  onChange,
  name,
}: {
  checked?: boolean;
  onChange?: (v: boolean) => void;
  /** Set for uncontrolled use inside a <form> (reads as "on" when checked). */
  name?: string;
}) {
  return (
    <label className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-3.5 cursor-pointer has-[:checked]:border-ink has-[:checked]:bg-volt-100">
      <input
        type="checkbox"
        name={name}
        {...(onChange ? { checked, onChange: (e) => onChange(e.target.checked) } : { defaultChecked: checked })}
        className="peer sr-only"
      />
      <span className="relative mt-0.5 w-10 h-6 rounded-full bg-gray-300 peer-checked:bg-ink transition-colors shrink-0 after:absolute after:top-1 after:left-1 after:w-4 after:h-4 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-4 peer-checked:after:bg-volt-400" />
      <span>
        <span className="block text-sm font-bold text-ink">Players confirm each game</span>
        <span className="block text-xs text-gray-500 mt-0.5">
          Players tap “I’m in” from their phone. When a game is full, the rest go on a waitlist. Only players who are in get a due.
        </span>
      </span>
    </label>
  );
}
