/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@retail-pos/shared-types', '@retail-pos/api-contracts'],
};

export default nextConfig;
