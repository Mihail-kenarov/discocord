/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/gw/:path*',
        destination: 'http://discordgw:8090/:path*', // gateway
      },
    ];
  },
};
export default nextConfig;