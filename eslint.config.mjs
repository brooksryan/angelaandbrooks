import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// eslint-config-next 15.5.x ships its rule presets as legacy `extends` strings
// (e.g. "next/core-web-vitals"), so we use FlatCompat to bring them into a
// flat config. Next 16 uses native flat-config exports — keep this in mind if
// we ever bump back up.
const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      // Build outputs from the Cloudflare adapters — never source.
      ".open-next/**",
      ".vercel/**",
      ".wrangler/**",
    ],
  },
];

export default eslintConfig;
