import { SESSION_FETCH, SESSION_DATA, SESSION_ERROR } from "./constants";

export interface UserSessionPayload {
  dateTo: Date;
  dateFrom: Date;
}

export interface UserSessionFetch {
  type: typeof SESSION_FETCH;
}
export interface UserSessionData {
  type: typeof SESSION_DATA;
  payload: UserSessionPayload;
}

export interface UserSessionError {
  type: typeof SESSION_ERROR;
  error: Error;
}

export type SessionAction =
  UserSessionFetch | UserSessionData | UserSessionError;

export const userSessionFetch = (): UserSessionFetch => ({
  type: SESSION_FETCH,
});

export const userSessionData = (
  payload: UserSessionPayload
): UserSessionData => ({
  type: SESSION_DATA,
  payload,
});

export const userSessionError = (error: Error): UserSessionError => ({
  type: SESSION_ERROR,
  error,
});
