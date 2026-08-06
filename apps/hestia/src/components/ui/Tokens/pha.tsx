import { ComponentProps } from "react";

export function PHA(props: ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 500 500"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      xmlSpace="preserve"
      id="Layer_1"
      data-name="layer 1"
      x={0}
      y={0}
      transform="scale(1.35)"
      {...props}
    >
      <defs>
        <style>{".cls-1{fill:#d1ff52;}"}</style>
      </defs>
      <circle cx={250} cy={250} r={250} fill="black" />
      <path
        d="M180 259.85h171.5v57.17H180zM351.51 174.1h57.17v85.76h-57.17zM180 317.03h-57.18v85.75h57.17v-57.16h.01v-28.59z"
        className="cls-1"
      />
      <path
        d="M351.51 116.93H122.82v142.93H180V174.1h171.51v-57.17z"
        className="cls-1"
      />
      <path d="M180 259.85h171.5v57.17H180z" className="cls-1" />
    </svg>
  );
}
