import { stagger } from '@/components/motion';

/** Brand colours a player's initials disc can take; the same player always gets the same one. */
const TONES = ['bg-volt-300 text-ink', 'bg-sun-400 text-ink', 'bg-kit-400 text-ink', 'bg-pitch-200 text-ink', 'bg-[#bfdbfe] text-ink'];

function toneFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length];
}

/**
 * A few players as overlapping initials discs, popping on one after another, then "+N".
 * Decorative: say who they are in text next to it.
 */
export function AvatarStack({
  people,
  max = 4,
  total,
  ring = 'ring-white',
  animate = true,
}: {
  people: { id: string; firstName: string }[];
  max?: number;
  /** Everyone, when `people` is only some of them. */
  total?: number;
  ring?: string;
  animate?: boolean;
}) {
  const shown = people.slice(0, max);
  const more = (total ?? people.length) - shown.length;
  if (!shown.length) return null;
  return (
    <span className="flex items-center -space-x-2" aria-hidden>
      {shown.map((p, i) => (
        <span
          key={p.id}
          style={animate ? stagger(i, 60, 150) : undefined}
          className={`w-8 h-8 rounded-full ring-2 ${ring} ${toneFor(p.id)} flex items-center justify-center text-xs font-extrabold ${
            animate ? 'animate-pop-in' : ''
          }`}
        >
          {p.firstName.charAt(0)}
        </span>
      ))}
      {more > 0 && (
        <span
          style={animate ? stagger(shown.length, 60, 150) : undefined}
          className={`h-8 min-w-8 px-1.5 rounded-full ring-2 ${ring} bg-ink text-white flex items-center justify-center text-[10px] font-extrabold tabular-nums ${
            animate ? 'animate-pop-in' : ''
          }`}
        >
          +{more}
        </span>
      )}
    </span>
  );
}
