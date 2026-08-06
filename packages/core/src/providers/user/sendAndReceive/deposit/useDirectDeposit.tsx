import { useContext } from "react";

import { DepositContext as Context } from ".";

export const useDirectDepositProvider = () => {
  const state = useContext(Context);

  if (!Context) {
    const error = new Error("useDirectDepositProvider context is undefined");
    error.name = "ContextError";
    Error?.captureStackTrace?.(error, useContext);
    throw error;
  }

  return { ...state };
};
