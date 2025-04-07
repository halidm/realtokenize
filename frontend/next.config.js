/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // This is needed for path aliases to work correctly
    config.resolve.fallback = {
      fs: false,
      path: false,
      buffer: require.resolve("buffer/"),
    };

    // Add buffer to polyfills
    config.plugins.push(
      new (require("webpack").ProvidePlugin)({
        Buffer: ["buffer", "Buffer"],
      })
    );

    return config;
  },
};

module.exports = nextConfig;
