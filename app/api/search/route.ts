import { createSource } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';
import { auth, type Permission } from '@/lib/auth';
import { headers } from 'next/headers';

export async function GET(request: Request) {
  // Get user session to filter search results
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // If not authenticated, return empty results
  if (!session) {
    return new Response(JSON.stringify({ results: [] }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userRole = ((session.user as { role?: string })?.role || 'member') as Permission;
  const filteredSource = createSource(userRole);

  // Create search handler with filtered source
  const { GET: searchHandler } = createFromSource(filteredSource, {
    language: 'english',
  });

  return searchHandler(request);
}
