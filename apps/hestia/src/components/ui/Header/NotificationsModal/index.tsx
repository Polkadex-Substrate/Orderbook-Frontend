import React, { Dispatch, SetStateAction, useMemo } from "react";
import { Button, Modal, Typography } from "@mitra/ux";
import { RiCloseLine } from "@remixicon/react";
import {
  useSettingsProvider,
  NotificationCategory,
  Notification,
} from "@orderbook/core/providers/public/settings";

import { Card } from "./card";

export const NotificationsModal = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
}) => {
  const {
    notifications: allNotifications,
    onReadAllNotifications,
    onClearNotifications,
    onReadNotification,
    onRemoveNotification,
  } = useSettingsProvider();
  const notifications: { [category: string]: Notification[] } = useMemo(() => {
    return allNotifications.reduce<{ [category: string]: Notification[] }>(
      (acc, notification) => {
        acc[notification.category] = [
          ...(acc[notification.category] || []),
          notification,
        ];
        return acc;
      },
      {}
    );
  }, [allNotifications]);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      placement="top right"
      closeOnClickOutside
      className="flex flex-col border-primary bg-level-0 border-x w-screen h-screen md:max-w-md overflow-x-hidden overflow-y-auto"
    >
      <Modal.Title className="flex justify-between items-center py-4 pl-4">
        <Typography.Text size="lg" bold>
          Notifications
        </Typography.Text>
        <Button.Icon
          variant="ghost"
          size="lg"
          appearance="secondary"
          rounded
          onClick={() => onOpenChange(false)}
        >
          <RiCloseLine className="w-full h-full text-primary" />
        </Button.Icon>
      </Modal.Title>
      <Modal.Content className="flex flex-col flex-1 gap-6">
        {Object.keys(notifications)
          .sort()
          .map((category, index) => {
            return (
              <div key={index} className="flex flex-col gap-3">
                <Typography.Text appearance="primary" className="px-4">
                  {category}
                </Typography.Text>
                <div className="flex flex-col gap-2">
                  {notifications[category].map(
                    ({ id, message, date, active, description, href }) => {
                      return (
                        <Card
                          key={id}
                          onClick={() => onReadNotification(id)}
                          category={category as NotificationCategory}
                          title={message}
                          date={new Date(date).toLocaleDateString()}
                          active={active}
                          href={href}
                          onRead={() => onReadNotification(id)}
                          onRemove={() => onRemoveNotification(id)}
                          onRedirect={() => {
                            onReadNotification(id);
                            href &&
                              window.open(
                                href,
                                "_blank",
                                "noopener, noreferrer"
                              );
                          }}
                        >
                          {description}
                        </Card>
                      );
                    }
                  )}
                </div>
              </div>
            );
          })}
      </Modal.Content>
      <Modal.Footer className="p-4 flex gap-2">
        <Button.Solid
          onClick={onReadAllNotifications}
          className="w-full"
          appearance="secondary"
        >
          Mark all as read
        </Button.Solid>
        <Button.Solid
          onClick={onClearNotifications}
          className="w-full"
          appearance="secondary"
        >
          Remove all
        </Button.Solid>
      </Modal.Footer>
    </Modal>
  );
};
