const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/tenant',
  trailingSlash: true,
  transpilePackages: ['@propertymaster/shared'],
  images: {
    unoptimized: true, // Required for static export
  },
  webpack: (config) => {
    config.resolve.alias['@'] = path.resolve(__dirname, 'src');
    return config;
  },
};

module.exports = nextConfig;
