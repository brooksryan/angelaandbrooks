// Configuration for @opennextjs/cloudflare. The minimal preset is enough for
// this site — there's no incremental-static-regeneration cache to worry about
// (every page is either fully static or server-rendered on demand for live
// data like the admin dashboard), so we skip the R2 bucket the default
// template wires in.

import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({});
