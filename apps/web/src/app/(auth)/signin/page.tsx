'use client';

import Link from 'next/link';
import { Logo } from '@/components/brand';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/toast';
import { loginWithPassword } from '@/lib/player';
import { SignInSwitch } from '@/components/signin-switch';

export default function SignInPage() {
  const router = useRouter();
  const { login, validate2FA } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ email: '', password: '' });

  // Pre-fill when arriving from the player app's "Switch to organising".
  useEffect(() => {
    const email = new URLSearchParams(window.location.search).get('email');
    if (email) setForm((f) => ({ ...f, email }));
  }, []);
  const [submitting, setSubmitting] = useState(false);
  const [twoFA, setTwoFA] = useState<{ required: boolean; userId: string }>({ required: false, userId: '' });
  const [code, setCode] = useState('');

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const result = await login(form.email.trim(), form.password);
      if (result.requires2FA) {
        setTwoFA({ required: true, userId: result.userId });
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      // Players sign in with the same email and password on the player side: if that's who this
      // is, take them there instead of failing (the site's "Sign in" button opens this page).
      if (/invalid credentials/i.test(err?.message ?? '')) {
        try {
          const res = await loginWithPassword(form.email.trim(), form.password);
          router.replace('needsPassword' in res ? `/me/login?email=${encodeURIComponent(form.email.trim())}` : '/me');
          return;
        } catch {
          // Not a player either.
        }
        toast.error('Wrong email or password.');
      } else {
        toast.error(err.message || 'Sign in failed');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handle2FASubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await validate2FA(twoFA.userId, code);
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Invalid 2FA code');
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = "w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-volt-300/70 focus:border-pitch-600";

  if (twoFA.required) {
    return (
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Logo />
          <h1 className="mt-6 text-[28px] leading-tight font-extrabold text-ink">Two-Factor Authentication</h1>
          <p className="mt-1 text-sm text-gray-500">Enter the 6-digit code from your authenticator app</p>
        </div>

        <form onSubmit={handle2FASubmit} className="space-y-4">
          <div>
            <label htmlFor="code" className="block text-xs font-bold text-gray-700 mb-1.5">
              Authentication Code
            </label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className={`${inputClass} text-center tracking-[0.3em] font-mono`}
              placeholder="000000"
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={submitting || code.length !== 6}
            className="w-full py-3 bg-ink text-volt-300 text-sm font-bold rounded-xl hover:bg-pitch-900 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Verifying...' : 'Verify'}
          </button>

          <button
            type="button"
            onClick={() => { setTwoFA({ required: false, userId: '' }); setCode(''); }}
            className="w-full py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
          >
            Back to sign in
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-6">
        <Logo />
      </div>
      <SignInSwitch current="organiser" email={form.email} />
      <div className="text-center mt-6 mb-6">
        <h1 className="text-[28px] leading-tight font-extrabold text-ink">Welcome back</h1>
        <p className="mt-1 text-sm text-gray-500">Sign in to run your groups, games and money</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-xs font-bold text-gray-700 mb-1.5">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={form.email}
            onChange={handleChange}
            className={inputClass}
            placeholder="you@example.com"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="password" className="block text-xs font-bold text-gray-700">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-pitch-600 font-medium hover:text-pitch-700"
            >
              Forgot?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            required
            value={form.password}
            onChange={handleChange}
            className={inputClass}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-ink text-volt-300 text-sm font-bold rounded-xl hover:bg-pitch-900 transition-colors disabled:opacity-50"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-pitch-600 font-semibold hover:text-pitch-700">
          Sign up
        </Link>
      </p>
    </div>
  );
}
