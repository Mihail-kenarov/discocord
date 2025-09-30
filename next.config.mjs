/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/gw/:path*',
        destination: 'http://discocord_gw:8080/:path*', // gateway
      },
    ];
  },
};
export default nextConfig;