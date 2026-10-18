'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

/** True when the person has asked their phone for less motion. */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

/**
 * Counts from the last value shown to the new one, like a scoreboard ticking over.
 * The first render shows the value straight away so pages don't count up from zero on every visit.
 */
export function useCountUp(value: number, durationMs = 900) {
  const reduced = usePrefersReducedMotion();
  const [shown, setShown] = useState(value);
  const from = useRef(value);

  useEffect(() => {
    const start = from.current;
    if (reduced || start === value) {
      from.current = value;
      setShown(value);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(start + (value - start) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      from.current = value;
    };
  }, [value, durationMs, reduced]);

  return shown;
}

/** A naira amount that ticks over when it changes. */
export function CountUpNaira({ value, className }: { value: number; className?: string }) {
  const shown = useCountUp(value);
  return <span className={`tabular-nums ${className ?? ''}`}>₦{shown.toLocaleString('en-NG')}</span>;
}

/** A short buzz on phones that support it (most Android phones; iPhones ignore it). */
export function buzz(pattern: number | number[] = 12) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Some browsers throw when vibration isn't allowed; it's only a nicety.
    }
  }
}

/** A number that ticks over when it changes, like CountUpNaira without the ₦. */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const shown = useCountUp(value);
  return <span className={`tabular-nums ${className ?? ''}`}>{shown.toLocaleString('en-NG')}</span>;
}

/** Delay for the i-th item in a list that comes on one after another. */
export function stagger(i: number, stepMs = 45, startMs = 0): CSSProperties {
  return { animationDelay: `${startMs + i * stepMs}ms` };
}

/** A dot that sends out a soft ring now and then: something live, or something waiting on you. */
export function LiveDot({ className = 'bg-volt-400' }: { className?: string }) {
  return (
    <span className="relative inline-flex w-2 h-2 shrink-0" aria-hidden>
      <span className={`absolute inset-0 rounded-full animate-ping-soft ${className}`} />
      <span className={`relative w-2 h-2 rounded-full ${className}`} />
    </span>
  );
}

/**
 * A ring that draws itself round to value/max, with whatever's passed as children in the middle.
 * The track and fill take Tailwind stroke colours.
 */
export function ProgressRing({
  value,
  max,
  size = 52,
  stroke = 5,
  trackClass = 'stroke-gray-100',
  fillClass = 'stroke-pitch-500',
  children,
}: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  trackClass?: string;
  fillClass?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const to = c * (1 - pct);
  return (
    <span className="relative inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className={trackClass} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={to}
          className={`${fillClass} animate-ring-draw transition-[stroke-dashoffset] duration-700`}
          style={{ '--ring-from': c, '--ring-to': to } as CSSProperties}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center">{children}</span>
    </span>
  );
}
