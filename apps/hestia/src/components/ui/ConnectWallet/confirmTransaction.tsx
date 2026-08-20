"use client";

import {
  Accordion,
  Button,
  Copy,
  Dropdown,
  Interaction,
  Loading,
  Modal,
  Skeleton,
  Typography,
  truncateString,
} from "@mitrabook/ux";
import { RiAddLine, RiFileCopyLine, RiGasStationLine } from "@remixicon/react";
import {
  Dispatch,
  Fragment,
  MouseEvent,
  SetStateAction,
  useMemo,
  useRef,
  useState,
} from "react";
import { useResizeObserver } from "usehooks-ts";
import Link from "next/link";
import {
  FeeAssetReserve,
  OTHER_ASSET_EXISTENTIAL,
  TransactionFeeProps,
  depositBlockMessage,
  depositBlockReason,
  enabledFeatures,
  useFunds,
  useTransactionFee,
} from "@orderbook/core/index";
import { useConnectWalletProvider } from "@orderbook/core/providers/user/connectWalletProvider";
import { formatDisplay } from "@orderbook/format";

import { ErrorMessage, GenericHorizontalItem, Terms } from "../ReadyToUse";

import { usePool } from "@/hooks";
const { payWithAnotherFee } = enabledFeatures;

interface Props extends TransactionFeeProps {
  action:
    | ((event: MouseEvent<HTMLButtonElement>) => Promise<void>)
    | ((event: MouseEvent<HTMLButtonElement>) => void);
  actionLoading: boolean;
  tokenFee: FeeAssetReserve | null;
  setTokenFee: Dispatch<SetStateAction<FeeAssetReserve | null>>;
  openFeeModal: boolean;
  setOpenFeeModal: Dispatch<SetStateAction<boolean>>;
}
export const ConfirmTransaction = ({
  action,
  extrinsicFn,
  sender,
  actionLoading,
  tokenFee,
  setTokenFee,
  openFeeModal,
  setOpenFeeModal,
}: Props) => {
  const [checked, setChecked] = useState(false);
  const { walletBalance = 0, selectedWallet } = useConnectWalletProvider();

  const { fee, hash, palletName, extrinsicName, loading, success } =
    useTransactionFee({
      extrinsicFn,
      sender,
    });

  const isLoading = useMemo(() => loading && !success, [loading, success]);

  const ref = useRef<HTMLButtonElement>(null);

  const { width = 0 } = useResizeObserver({
    ref,
    box: "border-box",
  });

  const {
    swapPrice = 0,
    swapLoading,
    poolReserves,
    poolReservesSuccess,
  } = usePool({
    asset: tokenFee?.id ?? "",
    amount: fee,
  });

  const { balances, loading: balancesLoading } = useFunds();

  const isPDEX = useMemo(() => tokenFee?.id === "PDEX", [tokenFee?.id]);

  const existential = useMemo(
    () => (isPDEX ? 1 : OTHER_ASSET_EXISTENTIAL),
    [isPDEX]
  );
  const selectedAssetBalance = useMemo(
    () => balances.find((e) => e.asset.id === tokenFee?.id),
    [tokenFee?.id, balances]
  );

  /*
   * Why the deposit is blocked, decided by the shared rule in depositCapacity.
   *
   * The check here used to be `walletBalance < fee + existential`, rendered as
   * "Your balance is not enough to pay the fee." - which was FALSE for the case
   * that hit it hardest. A new user whose entire balance is one 1 PDEX faucet
   * drip covers a 0.0128 fee easily; what they cannot do is keep the 1 PDEX the
   * chain requires an account to hold. They were told a lie about fees at the
   * most valuable moment in the funnel (Ybug #3, iOS).
   *
   * The reason is computed here and the MESSAGE comes from the same module, so
   * the constraint that actually bound is the one that gets named.
   */
  const pdexBlock = useMemo(
    () =>
      isPDEX
        ? depositBlockReason(0, {
            balance: walletBalance,
            fee,
            existential,
            isFeeAsset: true,
          })
        : null,
    [isPDEX, walletBalance, fee, existential]
  );

  const error = useMemo(
    () =>
      tokenFee?.id && isPDEX
        ? pdexBlock?.kind === "below-existential-floor"
        : // null = no on-chain pool for this token, so the fee cannot be
          // quoted (let alone paid) in it - that blocks, it isn't "free".
          swapPrice === null ||
          Number(selectedAssetBalance?.onChainBalance) < swapPrice,
    [
      tokenFee?.id,
      pdexBlock,
      selectedAssetBalance?.onChainBalance,
      swapPrice,
      isPDEX,
    ]
  );

  const shortHash = useMemo(() => truncateString(hash), [hash]);
  const shortAddress = useMemo(
    () => truncateString(selectedWallet?.address ?? "", 4),
    [selectedWallet?.address]
  );

  const disabled = useMemo(
    () => !!error || !tokenFee || !checked,
    [error, tokenFee, checked]
  );

  return (
    <Modal
      open={openFeeModal}
      onOpenChange={setOpenFeeModal}
      placement="center left"
      className="top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
    >
      <Modal.Content>
        <Loading.Spinner active={actionLoading}>
          <Interaction className="w-full gap-2 md:min-w-[24rem] md:max-w-[24rem]">
            <Interaction.Title
              onClose={{ onClick: () => setOpenFeeModal(false) }}
            >
              Confirm Transaction
            </Interaction.Title>
            <Interaction.Content className="flex flex-col p-3">
              <div className="flex flex-col border-b border-primary px-3 pb-4">
                <Typography.Text appearance="primary">
                  Extrinsic
                </Typography.Text>
                <Accordion type="multiple">
                  <Accordion.Item value="extrinsic">
                    <Accordion.Trigger>
                      <Skeleton
                        loading={isLoading}
                        className="min-h-4 max-w-28"
                      >
                        <Typography.Text>{extrinsicName}</Typography.Text>
                      </Skeleton>
                      <Accordion.Icon>
                        <RiAddLine className="w-4 h-4 text-primary" />
                      </Accordion.Icon>
                    </Accordion.Trigger>
                    <Accordion.Content>
                      <div className="flex flex-col mt-4 border-t border-primary">
                        <GenericHorizontalItem label="Name" className="px-0">
                          <Skeleton
                            loading={isLoading}
                            className="min-h-4 max-w-14"
                          >
                            <Copy value={hash}>
                              <Typography.Text>{palletName}</Typography.Text>
                            </Copy>
                          </Skeleton>
                        </GenericHorizontalItem>
                        <GenericHorizontalItem
                          label="Call hash"
                          className="px-0"
                        >
                          <Skeleton
                            loading={isLoading}
                            className="min-h-4 max-w-20"
                          >
                            <Copy value={hash}>
                              <div className="flex items-center gap-1">
                                <RiFileCopyLine className="w-3 h-3 text-secondary" />
                                <Typography.Text>{shortHash}</Typography.Text>
                              </div>
                            </Copy>
                          </Skeleton>
                        </GenericHorizontalItem>
                      </div>
                    </Accordion.Content>
                  </Accordion.Item>
                </Accordion>
              </div>
              <div className="flex flex-col border-b border-primary">
                <GenericHorizontalItem label="Sending from">
                  <Skeleton
                    loading={!selectedWallet}
                    className="min-h-4 max-w-24"
                  >
                    <Copy value="0xD3…6Ae">
                      <div className="flex items-center gap-1">
                        <RiFileCopyLine className="w-3 h-3 text-secondary" />
                        <Typography.Text>
                          {selectedWallet?.name} • {shortAddress}
                        </Typography.Text>
                      </div>
                    </Copy>
                  </Skeleton>
                </GenericHorizontalItem>
                {!!tokenFee && !isPDEX && !isLoading ? (
                  <GenericHorizontalItem
                    label="Estimated fee"
                    tooltip="Swap using Polkapool"
                  >
                    <div className="flex items-center gap-1">
                      <RiGasStationLine className="w-3.5 h-3.5 text-secondary" />
                      <Skeleton loading={swapLoading} className="min-h-4 w-10">
                        <div className="flex items-center gap-1">
                          <Typography.Text>{`${
                            swapPrice === null ? "-" : formatDisplay(swapPrice)
                          } ${tokenFee?.name}`}</Typography.Text>
                          <Typography.Text appearance="primary">
                            ≈
                          </Typography.Text>
                          <Typography.Text appearance="primary">{`${fee} PDEX`}</Typography.Text>
                        </div>
                      </Skeleton>
                    </div>
                  </GenericHorizontalItem>
                ) : (
                  <GenericHorizontalItem label="Estimated fee">
                    <div className="flex items-center gap-1">
                      <RiGasStationLine className="w-3.5 h-3.5 text-secondary" />
                      <Skeleton
                        loading={isLoading}
                        className="min-h-4 min-w-14"
                      >
                        <Typography.Text>{fee} PDEX</Typography.Text>
                      </Skeleton>
                    </div>
                  </GenericHorizontalItem>
                )}
                <GenericHorizontalItem label="Existential Amount">
                  <Typography.Text>1 PDEX</Typography.Text>
                </GenericHorizontalItem>
                <Dropdown>
                  <Dropdown.Trigger
                    ref={ref}
                    className=" px-3 py-3 bg-level-1 border border-primary"
                    disabled={!payWithAnotherFee}
                  >
                    <div className="flex-1 w-full flex items-cneter justify-between gap-2">
                      <Typography.Text appearance="primary">
                        Pay fee with
                      </Typography.Text>
                      <Typography.Text>
                        {tokenFee ? tokenFee.name : "Select token"}
                      </Typography.Text>
                    </div>
                    <Dropdown.Icon />
                  </Dropdown.Trigger>
                  <Dropdown.Content
                    style={{
                      minWidth: width,
                      maxHeight: 250,
                      overflow: "auto",
                    }}
                    className="scrollbar-hide min-w-56"
                  >
                    {!poolReservesSuccess ? (
                      <div className="flex flex-col gap-2 p-4">
                        {new Array(3).fill("").map((_, i) => (
                          <Skeleton key={i} className="min-h-10" loading />
                        ))}
                      </div>
                    ) : (
                      <Fragment>
                        {poolReserves?.map((e) => {
                          const balance = balances?.find(
                            (bal) => bal.asset.id === e.id
                          );

                          const disableDropdown =
                            !payWithAnotherFee && e?.id !== "PDEX";

                          return (
                            <Dropdown.Item
                              key={e.id}
                              onSelect={() => setTokenFee(e)}
                              className="flex justify-between items-center gap-2"
                              disabled={!e.poolReserve || disableDropdown}
                            >
                              {e.poolReserve ? (
                                <div className="flex items-center justify-between gap-1 w-full">
                                  <Typography.Text>{e.name}</Typography.Text>
                                  <div className="flex items-center gap-1">
                                    <Typography.Text appearance="primary">
                                      Balance:
                                    </Typography.Text>
                                    <Skeleton
                                      loading={balancesLoading}
                                      className="min-h-5"
                                    >
                                      <Typography.Text appearance="primary">
                                        {Number(
                                          balance?.onChainBalance
                                        ).toFixed(4)}
                                      </Typography.Text>
                                    </Skeleton>
                                  </div>
                                </div>
                              ) : (
                                <Fragment>
                                  <div className="flex items-center gap-1">
                                    <Typography.Text appearance="primary">
                                      {e.name}
                                    </Typography.Text>
                                    <Typography.Text appearance="primary">
                                      (Insufficient liquidity)
                                    </Typography.Text>
                                  </div>
                                  <Button.Solid
                                    size="xs"
                                    appearance="secondary"
                                  >
                                    <Link
                                      target="_blank"
                                      href="https://polkapool-test.netlify.app/pools"
                                    >
                                      Add liquidity
                                    </Link>
                                  </Button.Solid>
                                </Fragment>
                              )}
                            </Dropdown.Item>
                          );
                        })}
                      </Fragment>
                    )}
                  </Dropdown.Content>
                </Dropdown>
                {!actionLoading && error && (
                  <ErrorMessage className="p-3">
                    {/* Name the constraint that actually bound. "Not enough to
                        pay the fee" was false for the faucet-drip case, which
                        is the case that hits every new user. */}
                    {isPDEX && pdexBlock
                      ? depositBlockMessage(pdexBlock, "PDEX")
                      : swapPrice === null
                        ? "This asset has no on-chain pool to pay the fee with. Pay the fee in PDEX instead."
                        : `Your ${tokenFee?.name} balance cannot cover the fee. Pay the fee in PDEX instead.`}
                  </ErrorMessage>
                )}
              </div>
              <div className="px-3 pt-4">
                <Terms checked={checked} setChecked={setChecked} />
              </div>
            </Interaction.Content>
            <Interaction.Footer>
              <Interaction.Action
                disabled={disabled}
                appearance={disabled ? "secondary" : "primary"}
                onClick={action}
              >
                Sign and Submit
              </Interaction.Action>
              <Interaction.Close onClick={() => setOpenFeeModal(false)}>
                Close
              </Interaction.Close>
            </Interaction.Footer>
          </Interaction>
        </Loading.Spinner>
      </Modal.Content>
    </Modal>
  );
};
