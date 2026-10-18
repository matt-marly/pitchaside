'use client';

import { useEffect, useRef, useState } from 'react';

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
