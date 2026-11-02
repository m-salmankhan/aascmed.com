import { createClient, readFirst } from './content/strapi.ts';
import { contentToken } from './content/token.mjs';

export async function previewReadiness(): Promise<Response> {
  try {
    if (process.env.ASTRO_CONTENT_MODE !== 'draft') throw new Error('Preview is not configured');
    contentToken(true);
    await readFirst(createClient('draft').collection('blogs'), {
      status: 'draft', fields: ['documentId'], pagination: { pageSize: 1 },
    });
    return new Response('ready');
  } catch {
    return new Response('not ready', { status: 503 });
  }
}
