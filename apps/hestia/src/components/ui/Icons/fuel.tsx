import { ComponentProps } from "react";

export function Fuel(props: ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      {...props}
    >
      <path
        d="M3.5 22V5C3.5 3 4.84 2 6.5 2H14.5C16.16 2 17.5 3 17.5 5V22H3.5Z"
        stroke="currentColor"
        fill="none"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2 22H19"
        stroke="currentColor"
        fill="none"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.39 9.99998H12.62C13.66 9.99998 14.51 9.49999 14.51 8.10999V6.87999C14.51 5.48999 13.66 4.98999 12.62 4.98999H8.39C7.35 4.98999 6.5 5.48999 6.5 6.87999V8.10999C6.5 9.49999 7.35 9.99998 8.39 9.99998Z"
        stroke="currentColor"
        fill="none"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.5 13H9.5"
        stroke="currentColor"
        fill="none"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17.5 16.01L22 16V10L20 9"
        stroke="currentColor"
        fill="none"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
