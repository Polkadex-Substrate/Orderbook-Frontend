import { Typography, Illustrations, Interaction } from "@mitrabook/ux";
import { MouseEvent, useState } from "react";

import { MnemonicCard } from "../ReadyToUse";

export const TradingAccountMnemonic = ({
  onClose,
  mnemonic,
}: {
  onClose: () => void;
  mnemonic: string[];
}) => {
  const [state, setState] = useState(false);

  const onCopy = async (e: MouseEvent<HTMLButtonElement>) => {
    const value = mnemonic.join(" ");
    e.preventDefault();
    e.stopPropagation();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value.toString());
      if (!state) setState(true);
    } catch (error) {
      console.error("Error copying to clipboard:", error);
    }
  };

  const onMouseOut = () => state && setState(false);

  return (
    <Interaction className="w-full">
      <Interaction.Content className="flex flex-col gap-6 flex-1 mb-3">
        <div className="flex flex-col items-center text-center gap-5">
          <div className="max-w-[7rem]">
            <Illustrations.Mnemonic className="max-w-[8rem] w-full " />
          </div>
          <div className="flex flex-col gap-2">
            <Typography.Text bold size="xl">
              Mnemonic
            </Typography.Text>
            <Typography.Text appearance="primary">
              Please write down your trading account&apos;s mnemonic seed and
              keep it in a safe place. The mnemonic can be used to restore your
              trading account.
            </Typography.Text>
          </div>
        </div>
        <div className="group relative">
          <div className="scale-105 absolute w-full h-full top-0 left-0 backdrop-blur-[2px] z-10 group-hover:z-[-1] group-hover:backdrop-blur-0 transition-all duration-300" />
          <div className="relative flex flex-wrap gap-2">
            {mnemonic.map((v, i) => (
              <MnemonicCard key={v} position={i + 1}>
                {v}
              </MnemonicCard>
            ))}
          </div>
        </div>
      </Interaction.Content>
      <Interaction.Footer>
        <Interaction.Action
          appearance={state ? "success" : "secondary"}
          onClick={onCopy}
          onMouseOut={onMouseOut}
        >
          {state ? "Copied" : "Copy to clipboard"}
        </Interaction.Action>
        <Interaction.Close onClick={onClose}>Close</Interaction.Close>
      </Interaction.Footer>
    </Interaction>
  );
};
