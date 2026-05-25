import { createSource } from '@/lib/source';
import { auth, type Permission } from '@/lib/auth';
import { headers } from 'next/headers';

export const revalidate = false;

export async function GET() {
  // Get user session to filter results
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // If not authenticated, return unauthorized
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const userRole = ((session.user as { role?: string })?.role || 'member') as Permission;
  const filteredSource = createSource(userRole);

  const lines: string[] = [];
  lines.push('# Documentation');
  lines.push('');
  for (const page of filteredSource.getPages()) {
    lines.push(`- [${page.data.title}](${page.url}): ${page.data.description}`);
  }
  return new Response(lines.join('\n'));
}
