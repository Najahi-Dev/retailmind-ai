import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/super_admin',
        destination: '/super-admin',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
