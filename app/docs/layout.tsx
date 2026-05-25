import { createSource } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions } from '@/lib/layout.shared';
import { auth, type Permission } from '@/lib/auth';
import { headers } from 'next/headers';

export default async function Layout({ children }: LayoutProps<'/docs'>) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Get user role, default to 'member' (middleware ensures user is authenticated)
  const userRole = ((session?.user as { role?: string })?.role || 'member') as Permission;
  const filteredSource = createSource(userRole);

  return (
    <DocsLayout tree={filteredSource.getPageTree()} {...baseOptions()}>
      {children}
    </DocsLayout>
  );
}
