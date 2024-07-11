// TEMP

"use client";
import {
  ComponentProps,
  PropsWithChildren,
  useEffect,
  useRef,
  useState,
} from "react";
import classNames from "classnames";
import { twMerge } from "tailwind-merge";
import { Drawer as DrawerVaul } from "vaul";
import { isValidComponent } from "@polkadex/ux";

type DrawerTitleProps = ComponentProps<typeof DrawerVaul.Title>;
interface TitleProps extends DrawerTitleProps {
  onBack?: () => void;
}

const Title = ({
  children,
  className,
  ...props
}: PropsWithChildren<TitleProps>) => {
  return (
    <DrawerVaul.Title
      className={twMerge(
        classNames("flex items-center gap-2 text-white"),
        className
      )}
      {...props}
    >
      {children}
    </DrawerVaul.Title>
  );
};

const Footer = ({ children, ...props }: ComponentProps<"div">) => {
  return <div {...props}>{children}</div>;
};

const Content = ({ children, ...props }: ComponentProps<"div">) => {
  return <div {...props}>{children}</div>;
};

type DrawerRootProps = ComponentProps<typeof DrawerVaul.Root>;
type DrawerContentProps = ComponentProps<typeof DrawerVaul.Content>;

type DrawerProps = {
  closeOnClickOutside?: boolean;
  blured?: boolean;
  contentProps?: DrawerContentProps;
} & DrawerRootProps;

const Drawer = ({
  children,
  open,
  onOpenChange,
  closeOnClickOutside,
  shouldScaleBackground = true,
  blured = true,
  contentProps,
  ...props
}: PropsWithChildren<DrawerProps>) => {
  const [TitleComponent] = isValidComponent(children, Title);
  const [ContentComponent] = isValidComponent(children, Content);
  const [FooterComponent] = isValidComponent(children, Footer);
  const containerRef = useRef<HTMLElement | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, forceRender] = useState(0);
  useEffect(() => {
    containerRef.current = document.body;
    forceRender((prev) => prev + 1);
  }, []);

  return (
    <DrawerVaul.Root
      onOpenChange={onOpenChange}
      open={open}
      shouldScaleBackground={shouldScaleBackground}
      {...props}
    >
      <DrawerVaul.Portal container={containerRef.current}>
        <DrawerVaul.Overlay
          className={classNames(
            "z-[15] bg-overlay-2 inset-0 fixed data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            blured && "backdrop-blur-primary "
          )}
          onClick={
            closeOnClickOutside ? () => onOpenChange?.(false) : undefined
          }
        />
        <DrawerVaul.Content
          style={{ scrollbarGutter: "stable" }}
          className={twMerge(
            classNames(
              "fixed z-50 inset-x-0 bottom-0 mt-24 flex h-auto flex-col rounded-t-md border border-primary bg-level-1"
            ),
            contentProps?.className
          )}
          {...contentProps}
        >
          <div className="mx-auto mt-4 h-1.5 w-[40px] rounded-full bg-level-5" />

          {TitleComponent}
          {ContentComponent}
          {FooterComponent}
        </DrawerVaul.Content>
      </DrawerVaul.Portal>
    </DrawerVaul.Root>
  );
};

Drawer.Title = Title;
Drawer.Content = Content;
Drawer.Footer = Footer;

export { Drawer };
