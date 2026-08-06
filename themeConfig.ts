/**
 * Semantic and brand colours.
 *
 * Source of truth: the brand guidelines at polkadex.ee/mediaKit
 * (BrandGuidelines.md). Aligned 2026-07-31 - success, info and attention had all
 * drifted from the published palette, which is why the UI read as subtly
 * off-brand beside the marketing site even though the pink was correct.
 *
 * The guidelines' rule for extending this: "Don't add new colours outside this
 * palette. Extend by adjusting alpha on existing tokens." The -hover and
 * -pressed steps below are local derivations of a published base, which is
 * within that rule; a genuinely new hue is not.
 */
export const commom = {
  "primary-base": "#E6007A",
  "primary-hover": "#EA268E",
  "primary-pressed": "#9F005F",
  "primary-ghost": "#EA268E22",
  // NB: a disabled *surface*, not the guidelines' disabled text (#77777D, added
  // to the text scale below). Repainting this to #77777D would give disabled
  // buttons a light-grey fill on a near-black background.
  "primary-disabled": "#2B303A",
  // Violet - the brand's secondary colour and the gradient endpoint. Was absent
  // from the app entirely, so the brand gradient could not be reproduced.
  "violet-base": "#6745D2",
  "secondary-base": "#252932",
  "secondary-hover": "#3D4452",
  "secondary-pressed": "#454E5E",
  "tertiary-base": "#343A46",
  "tertiary-hover": "#373E4A",
  "tertiary-pressed": "#2B303A",
  "danger-base": "#EB5757",
  "danger-hover": "#EE6D6D",
  "danger-pressed": "#A41313",
  // was #02B671
  "success-base": "#0CA564",
  "success-hover": "#12BE75",
  "success-pressed": "#087F4C",
  // "Green" in the guidelines: positive metrics and growth. Explicitly NOT for
  // primary actions - that is what primary-base is for.
  "positive-base": "#00E676",
  // "warning" in the guidelines; the app calls it attention. was #F08205
  "attention-base": "#FFA500",
  "attention-hover": "#FFB733",
  "attention-pressed": "#D98C00",
  // was #077EED
  "info-base": "#148FE8",
  "info-hover": "#3FA6EE",
  "info-pressed": "#0F72BA",
  backgroundBase: "#06070A",
};

const commomBg = {
  "level-0": "#0D0D10",
  "level-1": "#131419",
  "level-2": "#252932",
  "level-3": "#1F2229",
  "level-4": "#2B303A",
  "level-5": "#3D4452",
};

const overlay = {
  "overlay-1": "#0000007F",
  "overlay-2": "#00000033",
  "overlay-3": "#000000CC",
};

const border = {
  primary: "#1F2229",
  secondary: "#2B303A",
  tertiary: "#343A46",
};

export const themeConfig = {
  theme: {
    extend: {
      screens: {
        "1xl": "1380px",
      },
      minHeight: {
        webKit: "-webkit-fill-available",
      },
      height: {
        webKit: "-webkit-fill-available",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        skeleton: `linear-gradient(
            -90deg,
            rgba(255, 255, 255, 0.1) 0%,
            rgba(255, 255, 255, 0.12) 25%,
            rgba(255, 255, 255, 0.20) 50%,
            rgba(255, 255, 255, 0.14) 75%,
            rgba(255, 255, 255, 0.1) 100%
          )`,
        grayscale: `linear-gradient(272.45deg, rgba(139, 161, 190, 0.1) -0.85%, rgba(139, 161, 190, 0) 81.69%);
          `,
      },
      colors: {
        ...commom,
        textBase: "#FFFFFF",
        // Secondary text per the brand guidelines (was #8B909A). Marginally
        // lighter, which also lifts contrast against the level-0/1 surfaces -
        // the old value sat close to the WCAG AA floor for small text.
        primary: "#A8ADB7",
        secondary: "#575A60",
        placeholder: "#FFFFFF7F",
        actionInput: "#FFFFFF33",
        // Disabled TEXT, per the guidelines (was #2B303A, a surface value).
        // Distinct from "primary-disabled" above, which is a disabled surface.
        disabled: "#77777D",
      },
      backgroundColor: {
        ...commom,
        ...commomBg,
        ...overlay,
      },
      outlineColor: {
        ...commom,
      },
      backgroundSize: {
        skeletonSize: "400% 400%",
      },
      fill: {
        ...commom,
        ...commomBg,
      },
      boxShadow: {
        baseShadow: "0px 20px 23px rgba(0, 0, 0, 0.05)",
      },
      borderColor: {
        ...commom,
        ...commomBg,
        ...border,
      },
      backdropBlur: {
        primary: "5px",
        secondary: "40px",
      },
      maxWidth: {
        "8xl": "90rem",
      },
      fontSize: {
        heading: "0.95rem",
        md: "0.9rem",
        base: "0.80rem",
      },
      animation: {
        infiniteHorizontalScroll: "30s linear infinite infiniteHorizontal ",
        skeletonAnimation:
          "skeletonPulse 2s cubic-bezier(0.2, 0.8, 0.2, 1) infinite",
        accordionDown: "accordionDown 300ms cubic-bezier(0.87, 0, 0.13, 1)",
        accordionUp: "accordionUp 300ms cubic-bezier(0.87, 0, 0.13, 1)",
        smoothBouce: "smoothBouce 6s infinite",
      },
      keyframes: {
        infiniteHorizontal: {
          from: {
            transform: "translate3d(0px, 0px, 0px)",
          },
          to: {
            transform: "translate3d(-50%, 0px, 0px)",
          },
        },
        skeletonPulse: {
          from: {
            backgroundPosition: "0% 0%",
          },
          to: {
            backgroundPosition: "-135% 0%",
          },
        },
        accordionDown: {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        accordionUp: {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        smoothBouce: {
          "0%, 100%": {
            transform: "translateY(0)",
          },
          "50%": {
            transform: "translateY(-30px)",
          },
        },
      },
    },
  },
  plugins: [],
};
