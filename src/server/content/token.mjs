import { readFileSync, statSync } from 'node:fs';
import { isAbsolute } from 'node:path';

// Public builds retain STRAPI_TOKEN; the production draft entry point requires a mounted file.
export function contentToken(requireFile = false) {
  const path = process.env.STRAPI_TOKEN_FILE;
  if (path !== undefined) {
    if (process.env.STRAPI_TOKEN !== undefined || !isAbsolute(path)) throw new Error('Invalid CMS token configuration');
    const file = statSync(path);
    if (!file.isFile() || file.size > 16384 || (file.mode & 0o077) !== 0) throw new Error('CMS token file must be private');
    const token = readFileSync(path, 'utf8').trim();
    if (!token || /[\r\n]/.test(token)) throw new Error('Invalid CMS token file');
    return token;
  }
  if (requireFile || (process.env.STRAPI_TOKEN !== undefined && !process.env.STRAPI_TOKEN.trim())) throw new Error('CMS token file is required');
  return process.env.STRAPI_TOKEN;
}
