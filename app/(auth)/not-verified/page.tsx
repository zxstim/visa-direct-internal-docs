'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from '@/lib/auth-client';

export default function NotVerifiedPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { data: session } = useSession();

  const handleSignOut = async () => {
    setLoading(true);
    await signOut();
    router.push('/sign-in');
  };

  return (
    <div className="w-full max-w-sm mx-auto text-center">
      <div className="mb-6">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-950 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-amber-600 dark:text-amber-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-2">Email Not Verified</h1>
        <p className="text-fd-muted-foreground">
          Your account is pending verification. Please contact an administrator
          to verify your email address.
        </p>
      </div>

      {session?.user?.email && (
        <div className="p-3 mb-6 text-sm bg-fd-muted rounded-lg">
          Signed in as <span className="font-medium">{session.user.email}</span>
        </div>
      )}

      <button
        type="button"
        onClick={handleSignOut}
        disabled={loading}
        className="w-full py-2 px-4 border border-fd-border rounded-lg font-medium hover:bg-fd-accent disabled:opacity-50 text-fd-foreground"
      >
        {loading ? 'Signing out...' : 'Sign out'}
      </button>
    </div>
  );
}
