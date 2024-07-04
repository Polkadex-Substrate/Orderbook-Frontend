// TEMP

import { ComponentProps } from "react";

export function Chart(props: ComponentProps<"svg">) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 469 265" {...props}>
      <mask
        id="mask0_1040_8079"
        style={{ maskType: "alpha" }}
        maskUnits="userSpaceOnUse"
        x="0"
        y="0"
        width="469"
        height="265"
      >
        <rect width="469" height="265" />
      </mask>
      <g mask="url(#mask0_1040_8079)" fill="none">
        <path
          d="M442.5 265.357C442.5 237.35 436.984 209.617 426.266 183.742C415.548 157.867 399.838 134.356 380.034 114.552C360.23 94.7476 336.719 79.0382 310.844 68.3203C284.969 57.6024 257.236 52.0859 229.228 52.0859C201.221 52.0859 173.488 57.6024 147.613 68.3203C121.738 79.0382 98.2269 94.7476 78.4228 114.552C58.6187 134.356 42.9092 157.867 32.1913 183.742C21.4735 209.617 15.957 237.35 15.957 265.357"
          stroke="#8BA1BE"
          stroke-opacity="0.2"
          stroke-width="30"
        />
        <g filter="url(#filter0_d_1040_8079)">
          <path
            d="M273.247 68.7465C242.57 62.5695 211.158 63.2632 181.188 70.4844"
            stroke="#E6007A"
            stroke-width="80"
          />
        </g>
      </g>
      <defs>
        <filter
          id="filter0_d_1040_8079"
          x="89.2184"
          y="24.5488"
          width="228.524"
          height="216.422"
          filterUnits="userSpaceOnUse"
          color-interpolation-filters="sRGB"
        >
          <feFlood flood-opacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dx="-23" dy="72" />
          <feGaussianBlur stdDeviation="29.8" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.901961 0 0 0 0 0 0 0 0 0 0.478431 0 0 0 0.33 0"
          />
          <feBlend
            mode="normal"
            in2="BackgroundImageFix"
            result="effect1_dropShadow_1040_8079"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1_dropShadow_1040_8079"
            result="shape"
          />
        </filter>
      </defs>
    </svg>
  );
}
