/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    const gatewayUrl = process.env.GATEWAY_URL || 'http://localhost:8090';
    return [
      {
        source: '/gw/:path*',
        destination: `${gatewayUrl}/:path*`,
      },
    ];
  },
};
export default nextConfig;
