/// <reference path="../.astro/types.d.ts" />
/// <reference types="@cloudflare/workers-types" />

type Runtime = import("@astrojs/cloudflare").Runtime<{
  DB: D1Database;
  SESSION: KVNamespace;
  ASSETS: Fetcher;
  RECEIPTS: R2Bucket;
}>;

declare namespace App {
  interface Locals extends Runtime {
    tenantId: number;
    userId: number | null;
  }
}
