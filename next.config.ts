import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['playwright', '@axe-core/playwright', '@libsql/client'],
};

export default nextConfig;
