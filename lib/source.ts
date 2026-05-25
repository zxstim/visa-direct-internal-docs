import { docs } from 'fumadocs-mdx:collections/server';
import { type InferPageType, loader } from 'fumadocs-core/source';
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons';
import { update } from 'fumadocs-core/source';
import { type Permission, permissionLevels } from './auth';

// Base source for static generation (includes all pages)
// See https://fumadocs.dev/docs/headless/source-api for more info
export const source = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
  plugins: [lucideIconsPlugin()],
});

// Permission-aware source factory that filters content based on user role
export function createSource(userPermission: Permission) {
  const baseSource = docs.toFumadocsSource();

  const filteredSource = update(baseSource)
    .files((files) =>
      files.filter((file) => {
        // Always include meta files (for navigation structure)
        if (file.type === 'meta') return true;

        // Get page permissions (array), default to ['member']
        const pagePermissions =
          (file.data as { permission?: Permission[] }).permission || ['member'];

        // User has access if their role meets ANY of the required permissions
        return pagePermissions.some(
          (perm) => permissionLevels[userPermission] >= permissionLevels[perm]
        );
      }),
    )
    .build();

  return loader({
    baseUrl: '/docs',
    source: filteredSource,
    plugins: [lucideIconsPlugin()],
  });
}

export function getPageImage(page: InferPageType<typeof source>) {
  const segments = [...page.slugs, 'image.png'];

  return {
    segments,
    url: `/og/docs/${segments.join('/')}`,
  };
}

export async function getLLMText(page: InferPageType<typeof source>) {
  const processed = await page.data.getText('processed');

  return `# ${page.data.title}

${processed}`;
}
