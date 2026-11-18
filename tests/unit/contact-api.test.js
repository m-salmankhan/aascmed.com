require('./helpers/register-react.js');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { API } = require('../../src/api/index.ts');

async function contactResponse(t, response) {
  t.mock.method(global, 'fetch', async () => response);
  return new API('https://runtime.example').contact({});
}

test('contact accepts HTTP 200 without requiring a JSON body', async t => {
  assert.deepEqual(await contactResponse(t, new Response(null, { status: 200 })), { ok: true });
});

test('contact preserves 400 JSON field errors and server copy', async t => {
  const detail = { field_errors: { email_address: ['Invalid email'] }, error: 'Please correct your email.' };
  assert.deepEqual(await contactResponse(t, Response.json({ detail }, { status: 400 })), {
    ...detail, ok: false, reason: 'rejected',
  });
});

test('contact rejects a non-JSON 400 body', async t => {
  assert.deepEqual(await contactResponse(t, new Response('<html>Bad request</html>', { status: 400 })), {
    ok: false, reason: 'rejected',
  });
});

test('contact reports HTTP 500 as a server failure', async t => {
  assert.deepEqual(await contactResponse(t, new Response(null, { status: 500 })), {
    ok: false, reason: 'server',
  });
});

test('contact bounds fetch to 15 seconds and distinguishes a timeout', async t => {
  const signal = AbortSignal.abort(new DOMException('Timed out', 'TimeoutError'));
  t.mock.method(AbortSignal, 'timeout', ms => { assert.equal(ms, 15000); return signal; });
  t.mock.method(global, 'fetch', async (_url, options) => {
    assert.equal(options.signal, signal);
    options.signal.throwIfAborted();
  });
  assert.deepEqual(await new API('https://runtime.example').contact({}), { ok: false, reason: 'timeout' });
});

test('contact distinguishes a network failure', async t => {
  t.mock.method(global, 'fetch', async () => { throw new TypeError('Network unavailable'); });
  assert.deepEqual(await new API('https://runtime.example').contact({}), { ok: false, reason: 'network' });
});
