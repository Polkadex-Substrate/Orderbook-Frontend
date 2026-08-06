import { ComponentProps } from "react";

export function BAT(props: ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 25 25"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M21 17.928l-7.464-4.274L6 17.947l15-.018z" fill="#662D91" />
      <path
        d="M13.538 5.054l-.002 8.6L21 17.929 13.538 5.054z"
        fill="#9E1F63"
      />
      <path d="M6 17.946l7.536-4.291.002-8.601L6 17.946z" fill="#FF5000" />
      <path
        d="M13.52 10.271l-3.08 5.147h6.176l-3.095-5.147z"
        fill="#fff"
        stroke="#FF5000"
        strokeWidth={0.3}
        strokeMiterlimit={10}
      />
    </svg>
  );
}
