import { ComponentProps } from "react";

export function ETH(props: ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 12 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M5.99049 0.11044V4.37554L0.646484 7.46094L5.99049 0.11044Z"
        fill="#F0CDC2"
      />
      <path
        d="M6.00977 0.11044V4.37554L11.3537 7.46094L6.00977 0.11044Z"
        fill="#C9B3F5"
      />
      <path
        d="M5.99123 5.43744V10.8809L0.585938 8.49119L5.99123 5.43744Z"
        fill="#88AAF1"
      />
      <path
        d="M6.00977 5.43744V10.8809L11.4151 8.49119L6.00977 5.43744Z"
        fill="#C9B3F5"
      />
      <path
        d="M0.585938 8.49036L5.99122 17.1113V10.88L0.585938 8.49036Z"
        fill="#F0CDC2"
      />
      <path
        d="M11.4151 8.49036L6.00977 17.1113V10.88L11.4151 8.49036Z"
        fill="#B8FAF6"
      />
    </svg>
  );
}
