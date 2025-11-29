/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/tenant',
  trailingSlash: true,
  transpilePackages: ['@propertymaster/shared'],
  images: {
    unoptimized: true, // Required for static export
  },
};

module.exports = nextConfig;
