/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/gw/:path*',
        destination: 'http://discocordgw:8080/:path*', // gateway
      },
    ];
  },
};
export default nextConfig;