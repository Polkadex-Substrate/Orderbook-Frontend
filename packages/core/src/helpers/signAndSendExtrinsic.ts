import { ApiPromise } from "@polkadot/api";
import { SubmittableExtrinsic } from "@polkadot/api/types";
import { ISubmittableResult, Signer } from "@polkadot/types/types";
import { EventRecord } from "@polkadot/types/interfaces";

export interface ExtrinsicResult {
  isSuccess: boolean;
  message?: string;
  eventMessages?: EventRecord[];
  hash: string;
}
export type AddToTxQueue = (value: SubmittableExtrinsic<"promise">) => void;

export const signAndSendExtrinsic = async (
  api: ApiPromise,
  extrinsic: SubmittableExtrinsic<"promise">,
  injector: { signer?: Signer },
  address: string,
  waitForFinalization = false,
  asset?: string
) => {
  return new Promise<ExtrinsicResult>((resolve, reject) => {
    const assetId = asset && asset !== "PDEX" ? { assetId: asset } : {};
    extrinsic
      .signAndSend(
        address,
        { signer: injector?.signer, ...assetId },
        ({ status, events, dispatchError }: ISubmittableResult) => {
          // status would still be set, but in the case of error we can shortcut
          // to just check it (so an error would indicate InBlock or Finalized)

          if (dispatchError) {
            if (dispatchError.isModule) {
              // for module errors, we have the section indexed, lookup
              const decoded = api.registry.findMetaError(
                dispatchError.asModule
              );
              const { docs, name, section } = decoded;

              const errMsg = `${section}.${name}: ${docs.join(" ")}`;
              reject(new Error(errMsg));
            } else {
              // Other, CannotLookup, BadOrigin, no extra info
              const errMsg = dispatchError.toString();
              reject(new Error(errMsg));
            }
          } else if (status.isInBlock && !waitForFinalization) {
            handleExtrinsicErrors(events, api);
            resolve({
              isSuccess: true,
              eventMessages: events,
              hash: extrinsic.hash.toHex(),
            });
          } else if (status.isFinalized && waitForFinalization) {
            handleExtrinsicErrors(events, api);
            resolve({
              isSuccess: true,
              eventMessages: events,
              hash: extrinsic.hash.toHex(),
            });
          }
        }
      )
      .catch((e) => {
        reject(new Error(e));
      });
  });
};
export const handleExtrinsicErrors = (
  events: EventRecord[],
  api: ApiPromise
) => {
  events
    // find/filter for failed events
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    .filter(({ event }) => api.events.system.ExtrinsicFailed.is(event))
    // we know that data for system.ExtrinsicFailed is
    // (DispatchError, DispatchInfo)
    .forEach(
      ({
        event: {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          data: [error],
        },
      }) => {
        // Other, CannotLookup, BadOrigin, no extra info
        throw Error(`Error: ${error.toHuman()}`);
      }
    );
};

export const handleTransaction = async (
  signedExtrinsic: SubmittableExtrinsic<"promise">
) =>
  await new Promise<ExtrinsicResult>((resolve, reject) => {
    signedExtrinsic
      .send((result) => {
        const { status, events, dispatchError } = result ?? {};
        if (dispatchError) {
          if (dispatchError.isModule) {
            // for module errors, we have the section indexed, lookup
            const decoded = signedExtrinsic.registry.findMetaError(
              dispatchError.asModule
            );
            const { docs, name, section } = decoded;

            const errMsg = `${section}.${name}: ${docs.join(" ")}`;
            reject(new Error(errMsg));
          } else {
            // Other, CannotLookup, BadOrigin, no extra info
            const errMsg = dispatchError.toString();
            reject(new Error(errMsg));
          }
        } else if (status.isFinalized) {
          resolve({
            isSuccess: true,
            eventMessages: events,
            hash: signedExtrinsic.hash.toHex(),
          });
        }
      })
      .catch((error) => reject(error));
  });
