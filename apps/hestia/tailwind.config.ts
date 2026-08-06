/** @type {import('tailwindcss').Config} */

import plugin from "tailwindcss/plugin";

import { themeConfig } from "../../themeConfig";

const config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/**/*.{js,ts,jsx,tsx,mdx}",
    // Workspace packages that render JSX. They are compiled into the app via
    // `transpilePackages`, but Tailwind scans SOURCE, not the module graph -
    // so without this their classes are never generated. The chart's states
    // were only styled because the same class happened to appear in an app
    // file too; removing that file would have silently unstyled the chart.
    "../../packages/chart/src/**/*.{js,ts,jsx,tsx}",
  ],
  ...themeConfig,
  plugins: [
    require("tailwindcss-animate"),
    plugin(function ({ addUtilities, addBase, theme }) {
      addBase({
        html: { color: theme("colors.white") },
      });
      addUtilities({
        ".scrollbar-hide": {
          "-ms-overflow-style": "none",
          "scrollbar-width": "none",
          "&::-webkit-scrollbar": {
            display: "none",
          },
        },
      });
    }),
  ],
  corePlugins: {
    preflight: false,
  },
};
export default config;
