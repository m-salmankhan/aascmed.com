import assert from 'node:assert/strict';
import test from 'node:test';
import { previewOrigins } from '../../src/server/preview-origins.ts';

test('framing and saved-refresh share normalized exact CMS origins', () => {
  const previous = { url: process.env.STRAPI_API_URL, frames: process.env.PREVIEW_FRAME_ORIGINS };
  try {
    process.env.STRAPI_API_URL = 'https://cms.example.test/api';
    process.env.PREVIEW_FRAME_ORIGINS = ' https://editor.example.test:8443 ,https://cms.example.test';
    assert.deepEqual(previewOrigins(), ['https://cms.example.test', 'https://editor.example.test:8443']);
    process.env.STRAPI_API_URL = 'not-a-url';
    process.env.PREVIEW_FRAME_ORIGINS = 'javascript:alert(1),https://user:password@cms.example.test,http://insecure.example.test';
    assert.deepEqual(previewOrigins(), []);
    process.env.PREVIEW_FRAME_ORIGINS = 'http://127.0.0.1:4321';
    assert.deepEqual(previewOrigins(), ['http://127.0.0.1:4321']);
  } finally {
    if (previous.url === undefined) delete process.env.STRAPI_API_URL; else process.env.STRAPI_API_URL = previous.url;
    if (previous.frames === undefined) delete process.env.PREVIEW_FRAME_ORIGINS; else process.env.PREVIEW_FRAME_ORIGINS = previous.frames;
  }
});
