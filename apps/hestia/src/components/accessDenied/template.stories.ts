import type { Meta, StoryObj } from "@storybook/react";

import { Template } from "./template";

const meta = {
  title: "Template/Access Denied",
  component: Template,
} satisfies Meta<typeof Template>;

export const AccessDenied: StoryObj<typeof meta> = {
  args: {},
};

export default meta;
