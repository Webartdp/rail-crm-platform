/** @type {import('next').NextConfig} */
const nextConfig = {
  // Deploys build into a separate folder and swap it in, so the running site keeps working during the build.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
