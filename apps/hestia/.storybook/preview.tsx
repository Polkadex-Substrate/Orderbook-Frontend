import type { Preview } from "@storybook/react";
import "@polkadex/ux/dist/index.css";
import "../src/styles/globals.scss";
import { Roboto } from "next/font/google";
import * as React from "react";

const font = Roboto({
  weight: ["100", "300", "400", "500", "700", "900"],
  subsets: ["latin"]
});

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i
      }
    }
  },
  decorators: [
    (Story) => {
      return (
        <div className={font.className}>
          <Story />
        </div>
      );
    }
  ]
};

export default preview;
