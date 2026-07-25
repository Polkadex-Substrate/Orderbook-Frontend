import { Accordion, Typography } from "@mitra/ux";
import Link from "next/link";
import { RiExternalLinkLine } from "@remixicon/react";

export const Info = () => {
  return (
    <div className="flex flex-col gap-6 w-screen md:min-w-[380px] md:max-w-[390px] rounded-md p-5">
      <Typography.Heading className="font-semibold text-lg">
        About
      </Typography.Heading>
      <Accordion
        type="multiple"
        defaultValue={["participate"]}
        className="flex flex-col gap-4"
      >
        <Accordion.Item
          value="participate"
          className="border-b border-primary pb-3"
        >
          <Accordion.Trigger>
            <Typography.Text appearance="primary">
              How can I participate in Rewards program?
            </Typography.Text>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content className="mt-3">
            <Typography.Paragraph className="leading-6" size="sm">
              All registered main accounts are automatically part of this
              program and will be scored for their performance and will be
              eligible for rewards. There is no extra input required from the
              user to participate in this program.
            </Typography.Paragraph>
          </Accordion.Content>
        </Accordion.Item>
        <Accordion.Item value="about" className="border-b border-primary pb-3">
          <Accordion.Trigger>
            <Typography.Text appearance="primary">
              What is an EPOCH?
            </Typography.Text>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content className="mt-3">
            <Typography.Paragraph
              className="leading-6 whitespace-normal"
              size="sm"
            >
              Polkadex uses an epoch and era based system to organize staking
              rewards and other network operations. An epoch is a period of time
              that lasts for 28 days, during which validators and nomination
              pools can initiate staking or earn rewards. At the end of one
              Epoch (or 28 days), newly staked PDEX become eligible to earn
              rewards, and rewards earned by previously eligible stakers are
              distributed to nominated validators and validator nodes.
            </Typography.Paragraph>
          </Accordion.Content>
        </Accordion.Item>
        <Accordion.Item value="time" className="border-b border-primary pb-3">
          <Accordion.Trigger>
            <Typography.Text appearance="primary">
              How long does an EPOCH last?
            </Typography.Text>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content className="mt-3">
            <Typography.Paragraph className="leading-6" size="sm">
              An epoch is 28 days on Polkadex chain.
            </Typography.Paragraph>
          </Accordion.Content>
        </Accordion.Item>
        <Accordion.Item
          value="markets"
          className="border-b border-primary pb-3"
        >
          <Accordion.Trigger>
            <Typography.Text appearance="primary">
              Why does each Epoch have designated markets?
            </Typography.Text>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content className="mt-3">
            <Typography.Paragraph className="leading-6" size="sm">
              It is not always necessary for all markets to participate in an
              epoch. Participation depends on several factors, such as market
              performance in the previous epoch and market trading volume etc.
            </Typography.Paragraph>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion>
      <Link href="#" className="text-info-base">
        Read more about Orderbook Rewards
        <RiExternalLinkLine className="w-3 h-3 inline-block ml-2" />
      </Link>
    </div>
  );
};
