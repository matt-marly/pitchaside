'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/brand';
import { NightStadium } from '@/components/illustrations';
import { PasswordSignIn } from '@/components/password-sign-in';
import { SignInSwitch } from '@/components/signin-switch';
import { http, storeRefreshToken } from '@/lib/http';

export default function PlayerLoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  // Sent from the organiser sign-in when the email is a player's: keep what they typed.
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => setEmail(new URLSearchParams(window.location.search).get('email') ?? ''), []);

  function onSignedIn() {
    router.replace('/me');
  }

  /** The same details as an organiser's: open the organiser side instead of failing. */
  async function asOrganiser(email: string, password: string) {
    try {
      const res = await http.post<{ requires2FA?: boolean; refreshToken?: string }>('/auth/login', { email, password });
      if (res.requires2FA) {
        // Their code goes on the organiser sign-in.
        router.replace(`/signin?email=${encodeURIComponent(email)}`);
        return true;
      }
      storeRefreshToken(res.refreshToken);
      window.location.assign('/dashboard');
      return true;
    } catch {
      return false;
    }
  }

  return (
    <div className="min-h-screen px-4 py-10">
      <div className="w-full max-w-sm mx-auto">
        <div className="relative h-36 rounded-3xl overflow-hidden bg-pitch-950 border-2 border-ink shadow-sticker">
          <NightStadium className="absolute inset-0 w-full h-full" />
          <div className="absolute inset-0 bg-gradient-to-t from-pitch-950 via-pitch-950/40 to-transparent" />
          <p className="absolute left-4 bottom-3 font-display text-2xl font-extrabold text-white leading-tight">
            Your games, payments
            <br />& player card
          </p>
        </div>
        <div className="text-center mt-6 mb-6">
          <Logo />
        </div>
        <div className="mb-6">
          <SignInSwitch current="player" />
        </div>
        {error && <div className="mb-3 bg-kit-400/10 border border-kit-400/40 text-kit-600 text-sm rounded-xl px-4 py-3">{error}</div>}
        {email !== null && <PasswordSignIn
          key={email}
          initialEmail={email}
          otherAccount={asOrganiser}
          title="Player sign in"
          onSignedIn={onSignedIn}
          footer={
            <p className="text-center text-xs text-gray-500">
              New here? Open the group link your organiser shared to create your account.
            </p>
          }
        />}
      </div>
    </div>
  );
}
