import { useContext } from "react";

import { Context } from ".";

export const useTheaProvider = () => {
  const state = useContext(Context);

  if (!Context) {
    const error = new Error("useTheaProvider context is undefined");
    error.name = "ContextError";
    Error?.captureStackTrace?.(error, useContext);
    throw error;
  }

  return { ...state };
};
