import { ComponentProps } from "react";

export function LINK(props: ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 25 25"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        clipRule="evenodd"
        d="M13 6l6.062 3.5v7L13 20l-6.062-3.5v-7L13 6z"
        stroke="#224DDA"
        fill="none"
        strokeWidth={3}
      />
    </svg>
  );
}
