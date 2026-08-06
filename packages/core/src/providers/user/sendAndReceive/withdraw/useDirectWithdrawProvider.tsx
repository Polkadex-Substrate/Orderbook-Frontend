import { useContext } from "react";

import { WithdrawContext as Context } from ".";

export const useDirectWithdrawProvider = () => {
  const state = useContext(Context);

  if (!Context) {
    const error = new Error("useDirectWithdrawProvider context is undefined");
    error.name = "ContextError";
    Error?.captureStackTrace?.(error, useContext);
    throw error;
  }

  return { ...state };
};
