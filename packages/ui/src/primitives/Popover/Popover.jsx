import * as React from 'react';
import { Popover as BasePopover } from '@base-ui/react/popover';
import { cx } from '../_utils/cx.js';

const Arrow = React.forwardRef(function PopoverArrow({ className = '', ...props }, ref) {
  return (
    <BasePopover.Arrow
      ref={ref}
      className={cx('ui-PopoverArrow', className)}
      {...props}
    />
  );
});

const Backdrop = React.forwardRef(function PopoverBackdrop({ className = '', ...props }, ref) {
  return (
    <BasePopover.Backdrop
      ref={ref}
      className={cx('ui-PopoverBackdrop', className)}
      {...props}
    />
  );
});

const Close = React.forwardRef(function PopoverClose(
  { className = '', children, render, ...props },
  ref
) {
  const resolvedRender =
    render ?? (React.isValidElement(children) ? children : undefined);

  return (
    <BasePopover.Close
      ref={ref}
      render={resolvedRender}
      className={cx('ui-PopoverClose', className)}
      {...props}
    >
      {resolvedRender ? undefined : children}
    </BasePopover.Close>
  );
});

const Description = React.forwardRef(function PopoverDescription({ className = '', ...props }, ref) {
  return (
    <BasePopover.Description
      ref={ref}
      className={cx('ui-PopoverDescription', className)}
      {...props}
    />
  );
});

const Handle = React.forwardRef(function PopoverHandle({ className = '', ...props }, ref) {
  return (
    <BasePopover.Handle
      ref={ref}
      className={cx('ui-PopoverHandle', className)}
      {...props}
    />
  );
});

const Popup = React.forwardRef(function PopoverPopup({ className = '', ...props }, ref) {
  return (
    <BasePopover.Popup
      ref={ref}
      className={cx('ui-PopoverPopup', className)}
      {...props}
    />
  );
});

const Portal = React.forwardRef(function PopoverPortal({ className = '', ...props }, ref) {
  return (
    <BasePopover.Portal
      ref={ref}
      className={cx('ui-PopoverPortal', className)}
      {...props}
    />
  );
});

const Positioner = React.forwardRef(function PopoverPositioner({ className = '', ...props }, ref) {
  return (
    <BasePopover.Positioner
      ref={ref}
      className={cx('ui-PopoverPositioner', className)}
      {...props}
    />
  );
});

const Root = React.forwardRef(function PopoverRoot({ className = '', ...props }, ref) {
  return (
    <BasePopover.Root
      ref={ref}
      className={cx('ui-PopoverRoot', className)}
      {...props}
    />
  );
});

const Title = React.forwardRef(function PopoverTitle({ className = '', ...props }, ref) {
  return (
    <BasePopover.Title
      ref={ref}
      className={cx('ui-PopoverTitle', className)}
      {...props}
    />
  );
});

const Trigger = React.forwardRef(function PopoverTrigger(
  { className = '', children, render, ...props },
  ref
) {
  const resolvedRender =
    render ?? (React.isValidElement(children) ? children : undefined);

  return (
    <BasePopover.Trigger
      ref={ref}
      render={resolvedRender}
      className={cx('ui-PopoverTrigger', className)}
      {...props}
    >
      {resolvedRender ? undefined : children}
    </BasePopover.Trigger>
  );
});

const Viewport = React.forwardRef(function PopoverViewport({ className = '', ...props }, ref) {
  return (
    <BasePopover.Viewport
      ref={ref}
      className={cx('ui-PopoverViewport', className)}
      {...props}
    />
  );
});

export const Popover = {
  ...BasePopover,
  Arrow, Backdrop, Close, Description, Handle, Popup, Portal, Positioner, Root, Title, Trigger, Viewport
};
