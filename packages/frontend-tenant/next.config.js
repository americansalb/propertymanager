/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@propertymaster/shared'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/v1/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
