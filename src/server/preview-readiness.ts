import { createClient } from './content/strapi.ts';
import { contentToken } from './content/token.mjs';

export async function previewReadiness(): Promise<Response> {
  try {
    if (process.env.ASTRO_CONTENT_MODE !== 'draft') throw new Error('Preview is not configured');
    contentToken(true);
    const result = await createClient('draft').collection('blogs').find({
      status: 'draft', fields: ['documentId'], pagination: { pageSize: 1 },
    });
    if (!Array.isArray(result.data)) throw new Error('Invalid CMS response');
    return new Response('ready');
  } catch {
    return new Response('not ready', { status: 503 });
  }
}
