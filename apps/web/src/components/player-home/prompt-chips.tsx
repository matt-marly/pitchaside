'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Sheet } from '@/components/sheet';
import { getPushState, requestPushPermission, subscribePush, type PushState } from '@/lib/push';
import { subscribePlayerPush } from '@/lib/player';

const WEEK = 7 * 24 * 60 * 60 * 1000;
const PUSH_KEY = 'pa_push_chip_dismissed';
// Same key as the full InstallCard, so dismissing either one hides both.
const INSTALL_KEY = 'pa_install_dismissed';

function dismissedWithin(key: string, ms: number) {
  try {
    const at = Number(localStorage.getItem(key));
    return !!at && Date.now() - at < ms;
  } catch {
    return false;
  }
}

function remember(key: string) {
  try {
    localStorage.setItem(key, Date.now().toString());
  } catch {
    /* private mode: it just shows again next time */
  }
}

/** One-line prompt with an action and a ×. */
function Chip({
  icon,
  children,
  action,
  onDismiss,
  dismissLabel,
}: {
  icon: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  onDismiss: () => void;
  dismissLabel: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-full bg-white border border-gray-200 shadow-card pl-2 pr-1 min-h-[52px]">
      <span className="w-9 h-9 rounded-full bg-chalk text-ink flex items-center justify-center shrink-0" aria-hidden>
        {icon}
      </span>
      <p className="flex-1 min-w-0 text-[13px] font-semibold text-ink leading-tight">{children}</p>
      {action}
      <button onClick={onDismiss} className="w-11 h-11 shrink-0 rounded-full text-gray-500 hover:text-ink text-xl leading-none" aria-label={dismissLabel}>
        ×
      </button>
    </div>
  );
}

const bell = (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
  </svg>
);

/**
 * Notifications, as a chip on Home: only while they're off (or blocked), hidden for a week on ×.
 * The full control stays on Me.
 */
export function PushChip() {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    if (dismissedWithin(PUSH_KEY, WEEK)) return;
    getPushState().then(setState);
  }, []);

  if (state !== 'off' && state !== 'ready' && state !== 'denied') return null;
  const dismiss = () => {
    remember(PUSH_KEY);
    setState(null);
  };

  if (state === 'denied') {
    return (
      <>
        <Chip
          icon={bell}
          onDismiss={dismiss}
          dismissLabel="Hide the notifications tip for a week"
          action={
            <button onClick={() => setHelp(true)} className="min-h-11 px-3 rounded-full text-[13px] font-bold text-pitch-700 hover:text-ink shrink-0">
              How to allow
            </button>
          }
        >
          Notifications are blocked
        </Chip>
        {help && (
          <Sheet titleId="push-help" align="left" onClose={() => setHelp(false)}>
            <h2 id="push-help" className="font-display text-xl font-extrabold text-ink">
              Turn notifications back on
            </h2>
            <ol className="mt-3 space-y-2 text-sm text-gray-700 list-decimal pl-5">
              <li>Tap the lock or the settings icon next to the web address.</li>
              <li>Find Notifications and set it to Allow.</li>
              <li>Come back here and pull down to refresh.</li>
            </ol>
            <p className="mt-3 text-sm text-gray-600">On iPhone, add PitchAside to your home screen first, then allow notifications when it asks.</p>
            <button onClick={() => setHelp(false)} className="mt-5 w-full min-h-12 rounded-xl bg-ink text-sm font-bold text-volt-300">
              Got it
            </button>
          </Sheet>
        )}
      </>
    );
  }

  return (
    <Chip
      icon={bell}
      onDismiss={dismiss}
      dismissLabel="Hide the notifications tip for a week"
      action={
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              // iOS can need the permission prompt and the subscription in two separate taps.
              if (state === 'ready' || Notification.permission === 'granted') setState(await subscribePush(subscribePlayerPush));
              else setState(await requestPushPermission());
            } finally {
              setBusy(false);
            }
          }}
          className="min-h-11 px-3.5 rounded-full bg-volt-400 text-[13px] font-bold text-ink shrink-0 disabled:opacity-50"
        >
          {busy ? '…' : state === 'ready' ? 'Finish' : 'Turn on'}
        </button>
      }
    >
      Get pinged for games and receipts
    </Chip>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** "Add to home screen", as a chip: Android gets the native prompt, iPhone gets the how-to. */
export function InstallChip() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone || dismissedWithin(INSTALL_KEY, 3 * 24 * 60 * 60 * 1000)) return;
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIos(isIos);
    if (isIos) setShown(true);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setShown(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  if (!shown) return null;
  return (
    <Chip
      icon={<img src="/icons/icon-192.png" alt="" className="w-9 h-9 rounded-full" />}
      onDismiss={() => {
        remember(INSTALL_KEY);
        setShown(false);
      }}
      dismissLabel="Hide the home screen tip for 3 days"
      action={
        deferred ? (
          <button
            onClick={async () => {
              await deferred.prompt();
              await deferred.userChoice;
              setShown(false);
            }}
            className="min-h-11 px-3.5 rounded-full bg-volt-400 text-[13px] font-bold text-ink shrink-0"
          >
            Install
          </button>
        ) : undefined
      }
    >
      {ios ? 'Add to Home Screen: tap Share, then “Add to Home Screen”' : 'Add PitchAside to your home screen'}
    </Chip>
  );
}
