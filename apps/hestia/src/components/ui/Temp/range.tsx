import { Button } from "@mitra/ux";

interface RangeProps {
  ranges: {
    value: string;
    action: () => void;
  }[];
}
export const Range = ({ ranges }: RangeProps) => {
  return (
    <div className="flex justify-between gap-2 items-center">
      {ranges.map(({ value, action }, i) => (
        <Button.Outline
          appearance="secondary"
          key={i}
          size="xs"
          onClick={(e) => {
            e.preventDefault();
            action();
          }}
          className="flex-1"
        >
          {value}
        </Button.Outline>
      ))}
    </div>
  );
};
