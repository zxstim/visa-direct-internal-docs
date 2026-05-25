'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, twoFactor } from '@/lib/auth-client';
import Link from 'next/link';

export function SignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/docs';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn.email({
        email,
        password,
      });

      if (result.error) {
        if (result.error.code === 'TWO_FACTOR_REQUIRED') {
          setRequires2FA(true);
        } else {
          setError(result.error.message || 'Sign in failed');
        }
        setLoading(false);
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  const handleTOTPVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await twoFactor.verifyTotp({
        code: totpCode,
      });

      if (result.error) {
        setError(result.error.message || 'Invalid code');
        setLoading(false);
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  const handlePasskeySignIn = async () => {
    setError('');
    setLoading(true);

    try {
      const result = await signIn.passkey();

      if (result?.error) {
        setError(result.error.message || 'Passkey sign in failed');
        setLoading(false);
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  if (requires2FA) {
    return (
      <div className="w-full max-w-sm mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-center">
          Two-Factor Authentication
        </h1>
        <form onSubmit={handleTOTPVerify} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950 rounded-lg">
              {error}
            </div>
          )}
          <div>
            <label
              htmlFor="totp"
              className="block text-sm font-medium mb-1.5 text-fd-foreground"
            >
              Authentication Code
            </label>
            <input
              id="totp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
              placeholder="Enter 6-digit code"
              className="w-full px-3 py-2 border border-fd-border rounded-lg bg-fd-background text-fd-foreground focus:outline-none focus:ring-2 focus:ring-fd-ring"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-fd-primary text-fd-primary-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Verify'}
          </button>
          <button
            type="button"
            onClick={() => setRequires2FA(false)}
            className="w-full py-2 px-4 text-fd-muted-foreground hover:text-fd-foreground text-sm"
          >
            Back to sign in
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-center">Sign In</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950 rounded-lg">
            {error}
          </div>
        )}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium mb-1.5 text-fd-foreground"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-3 py-2 border border-fd-border rounded-lg bg-fd-background text-fd-foreground focus:outline-none focus:ring-2 focus:ring-fd-ring"
            required
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium mb-1.5 text-fd-foreground"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="w-full px-3 py-2 border border-fd-border rounded-lg bg-fd-background text-fd-foreground focus:outline-none focus:ring-2 focus:ring-fd-ring"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 bg-fd-primary text-fd-primary-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-fd-border"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-fd-background text-fd-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={handlePasskeySignIn}
        disabled={loading}
        className="w-full py-2 px-4 border border-fd-border rounded-lg font-medium hover:bg-fd-accent disabled:opacity-50 text-fd-foreground"
      >
        Sign in with Passkey
      </button>

      <p className="mt-6 text-center text-sm text-fd-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link href="/sign-up" className="text-fd-primary hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
