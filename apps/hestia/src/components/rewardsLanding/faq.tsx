import { Accordion, Typography } from "@mitra/ux";

export const Faq = () => {
  return (
    <div className="flex flex-col gap-12 px-2 max-md:px-8 my-10 ">
      <Typography.Heading size="3xl">
        Frequently Asked Questions
      </Typography.Heading>
      <Accordion
        type="multiple"
        defaultValue={["about"]}
        className="flex flex-col gap-4"
      >
        <Accordion.Item
          value="about"
          className="border-b border-primary/50 pb-3"
        >
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
              pools can initiate staking or earn rewards.. At the end of one
              Epoch (or 28 days), newly staked PDEX become eligible to earn
              rewards, and rewards earned by previously eligible stakers are
              distributed to nominated validators and validator nodes.
            </Typography.Paragraph>
          </Accordion.Content>
        </Accordion.Item>
        <Accordion.Item
          value="time"
          className="border-b border-primary/50 pb-3"
        >
          <Accordion.Trigger>
            <Typography.Text appearance="primary">
              How long does an EPOCH last?
            </Typography.Text>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content className="mt-3">
            <Typography.Paragraph className="leading-6" size="sm">
              An epoch is 28 days on Polkadex chain, .
            </Typography.Paragraph>
          </Accordion.Content>
        </Accordion.Item>
        <Accordion.Item
          value="markets"
          className="border-b border-primary/50 pb-3"
        >
          <Accordion.Trigger>
            <Typography.Text appearance="primary">
              Why does each Epoch have designated markets?
            </Typography.Text>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content className="mt-3">
            <Typography.Paragraph className="leading-6" size="sm">
              Lorem Ipsum is simply dummy text of the printing and typesetting
              industry.
            </Typography.Paragraph>
          </Accordion.Content>
        </Accordion.Item>
        <Accordion.Item value="rewards">
          <Accordion.Trigger>
            <Typography.Text appearance="primary">
              How are the rewards calculated?
            </Typography.Text>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content className="mt-3">
            <Typography.Paragraph className="leading-6" size="sm">
              Lorem Ipsum is simply dummy text of the printing and typesetting
              industry.
            </Typography.Paragraph>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion>
    </div>
  );
};
