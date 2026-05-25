'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from '@/lib/auth-client';
import Link from 'next/link';

export function UserMenu() {
  const { data: session, isPending } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isPending) {
    return (
      <div className="w-8 h-8 rounded-full bg-fd-muted animate-pulse" />
    );
  }

  if (!session) {
    return (
      <Link
        href="/sign-in"
        className="px-4 py-2 text-sm font-medium text-fd-foreground hover:text-fd-primary border border-fd-border rounded-full ml-4"
      >
        Sign In
      </Link>
    );
  }

  const initials = session.user.name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || session.user.email[0].toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    router.push('/sign-in');
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-8 h-8 rounded-full bg-fd-primary text-fd-primary-foreground text-sm font-medium hover:opacity-90 ml-4"
      >
        {initials}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-fd-popover border border-fd-border rounded-lg shadow-lg z-50">
          <div className="px-4 py-3 border-b border-fd-border">
            <p className="text-sm font-medium text-fd-foreground truncate">
              {session.user.name}
            </p>
            <p className="text-xs text-fd-muted-foreground truncate">
              {session.user.email}
            </p>
            <p className="text-xs text-fd-muted-foreground mt-1 capitalize">
              Role: {(session.user as { role?: string }).role || 'member'}
            </p>
          </div>
          <div className="py-1">
            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2 text-sm text-fd-foreground hover:bg-fd-accent"
            >
              Settings
            </Link>
            <button
              onClick={handleSignOut}
              className="w-full text-left px-4 py-2 text-sm text-fd-foreground hover:bg-fd-accent"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
