import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  compress: true,
  reactStrictMode: true,
  typescript: {
    // The web app imports the server's router *type* (src/lib/orpc.ts ->
    // ../../../server/src/routes) for end-to-end oRPC type safety. That pulls
    // the Bun-native server module graph (elysia, @orpc/server, @upstash/redis,
    // and `bun` itself) into `next build`'s type-check. Those deps aren't — and
    // `bun` can't be — resolved in a web-only npm/Vercel install, so tsc fails
    // on server files that are irrelevant to the deployed web bundle.
    // Type safety is still enforced locally via `bun run build` / typecheck
    // against the full workspace; only the Vercel build skips the tsc gate.
    ignoreBuildErrors: true
  }
};

export default nextConfig;
