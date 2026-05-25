import { defineConfig, defineDocs, frontmatterSchema, metaSchema } from 'fumadocs-mdx/config';
import { z } from 'zod';

const permissionSchema = z.enum(['member', 'admin']);

// Extended frontmatter schema with permission field for access control
// Accepts single value or array, normalizes to array
const extendedFrontmatterSchema = frontmatterSchema.extend({
  permission: z
    .union([permissionSchema, z.array(permissionSchema)])
    .default('member')
    .transform((val) => (Array.isArray(val) ? val : [val])),
});

// You can customise Zod schemas for frontmatter and `meta.json` here
// see https://fumadocs.dev/docs/mdx/collections
export const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    schema: extendedFrontmatterSchema,
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
  meta: {
    schema: metaSchema,
  },
});

export default defineConfig({
  mdxOptions: {
    // MDX options
  },
});
