/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {}, // v3 必須用這個名字，不能改
    autoprefixer: {},
  },
};

export default config;