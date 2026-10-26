import assert from "node:assert/strict";
import test from "node:test";

import { createPublicConfig } from "../../src/shared/config/public.ts";

test("public contact backend configuration is distinct from the CMS settings", () => {
  assert.deepEqual(createPublicConfig(), {
    contactApiBaseUrl: "https://api.aascmed.com",
    mapboxAccessToken: "",
  });
  assert.deepEqual(createPublicConfig({ contactApiBaseUrl: "https://contact.example.test" }), {
    contactApiBaseUrl: "https://contact.example.test",
    mapboxAccessToken: "",
  });
});
