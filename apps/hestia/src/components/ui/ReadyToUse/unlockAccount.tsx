import { Interaction, Typography, Passcode } from "@mitra/ux";
import { useFormik } from "formik";
import { useEffect, useMemo, useState } from "react";
import { unLockAccountValidations } from "@orderbook/core/validations";
import { KeyringPair } from "@polkadot/keyring/types";

import { Icons } from "..";

import { ErrorMessage } from ".";

export const UnlockAccount = ({
  onClose,
  tempBrowserAccount,
  onAction,
  onResetTempBrowserAccount,
}: {
  onClose: () => void;
  onAction: (account: KeyringPair, password: string) => Promise<void> | void;
  tempBrowserAccount?: KeyringPair;
  onResetTempBrowserAccount?: () => void;
  loading?: boolean;
}) => {
  const [error, setError] = useState("");
  const handleClose = () => {
    if (typeof onResetTempBrowserAccount === "function")
      onResetTempBrowserAccount?.();
    onClose();
  };
  const { setFieldValue, values, handleSubmit, isValid, dirty, resetForm } =
    useFormik({
      initialValues: {
        password: "",
      },
      validationSchema: unLockAccountValidations,
      onSubmit: async ({ password }) => {
        try {
          const pass = password?.replace(/\s+/g, "");
          tempBrowserAccount?.unlock(pass);
          if (tempBrowserAccount) {
            await onAction(tempBrowserAccount, pass);
            handleClose();
          }
        } catch (error) {
          setError("Invalid Password");
          resetForm();
        }
      },
    });

  const digitsLeft = useMemo(
    () =>
      5 -
      Array.from(String(values.password.replace(/\s/g, "")), (v) => Number(v))
        .length,
    [values]
  );

  const message =
    isValid && dirty
      ? "Unlock"
      : `${digitsLeft} digit${digitsLeft > 1 ? "s" : ""} left`;

  useEffect(() => {
    if (error && !!values.password) setError("");
  }, [error, values.password]);

  return (
    <form onSubmit={handleSubmit}>
      <Interaction className="bg-backgroundBase rounded-sm w-full">
        <Interaction.Content className="flex flex-col gap-1 flex-1">
          <div className="flex flex-col gap-8 items-center">
            <div className="flex flex-col text-center items-center gap-5">
              <div className="flex items-center justify-center rounded-full w-12 h-12 bg-level-2">
                <Icons.Lock className="w-5 h-5" />
              </div>
              <div className="flex flex-col text-center items-center gap-1">
                <Typography.Text bold size="xl">
                  Unlock trading account
                </Typography.Text>
                <Typography.Paragraph appearance="primary" size="sm">
                  Enter 5-digit password to unlock your account
                </Typography.Paragraph>
              </div>
            </div>
            <div className="flex flex-col gap-2 w-full px-6">
              <Passcode.Outline
                focusOnInit
                value={values.password}
                onValuesChange={(e) => setFieldValue("password", e)}
                className="flex-1 py-7"
                name="password"
              />

              {!!error && <ErrorMessage>{error}</ErrorMessage>}
            </div>
          </div>
        </Interaction.Content>
        <Interaction.Footer>
          <Interaction.Action type="submit" disabled={!(isValid && dirty)}>
            {message}
          </Interaction.Action>
          <Interaction.Close
            onClick={(e) => {
              e.preventDefault();
              handleClose();
            }}
          >
            Cancel
          </Interaction.Close>
        </Interaction.Footer>
      </Interaction>
    </form>
  );
};
