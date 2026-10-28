import assert from "node:assert/strict";
import test from "node:test";

import { createPublicConfig } from "../../src/shared/config/public.ts";

test("public runtime API configuration is distinct from Strapi content settings", () => {
  assert.deepEqual(createPublicConfig(), {
    runtimeApiBaseUrl: "https://api.aascmed.com",
    mapboxAccessToken: "",
  });
  assert.deepEqual(createPublicConfig({ runtimeApiBaseUrl: "https://api.example.test" }), {
    runtimeApiBaseUrl: "https://api.example.test",
    mapboxAccessToken: "",
  });
});
