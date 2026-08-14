import { NativeApiAction } from "./actions";
import {
  NATIVEAPI_CONNECT_DATA,
  NATIVEAPI_CONNECT_ERROR,
  NATIVEAPI_CONNECT_FETCH,
  NATIVEAPI_DISCONNECT_DATA,
} from "./constants";
import { NativeApiState } from "./types";

export const initialState: NativeApiState = {
  connected: false,
  connecting: true,
};

export const nativeApiReducer = (
  state = initialState,
  action: NativeApiAction
): NativeApiState => {
  switch (action.type) {
    case NATIVEAPI_CONNECT_FETCH:
      return {
        ...state,
        connected: false,
        connecting: true,
        timestamp: Math.floor(Date.now() / 1000),
      };

    case NATIVEAPI_CONNECT_DATA:
      return {
        ...state,
        connected: true,
        connecting: false,
        api: action.payload,
      };

    // Both leave `connected: false, connecting: false`, which is the third
    // state: we are not connected AND we are no longer trying. Read it with
    // helpers/apiConnectionStatus.ts rather than re-deriving it - the footer
    // used `connected ? "Connected" : "Connecting"` and so reported a dead RPC
    // as still connecting.
    //
    // `hasExtension: false` used to be set here and has been removed. An RPC
    // that will not answer has nothing to do with whether a browser wallet
    // extension is installed; conflating the two invites a future reader to
    // show "install an extension" when the chain is simply unreachable. Nothing
    // read this field - the extension flag that IS used lives in the settings
    // provider - so it was dead as well as wrong.
    case NATIVEAPI_CONNECT_ERROR:
    case NATIVEAPI_DISCONNECT_DATA:
      return {
        ...state,
        connected: false,
        connecting: false,
      };
    default:
  }

  return state;
};
