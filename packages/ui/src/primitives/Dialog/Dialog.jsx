import * as React from 'react';
import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { cx } from '../_utils/cx.js';

const Backdrop = React.forwardRef(function DialogBackdrop({ className = '', ...props }, ref) {
  return (
    <BaseDialog.Backdrop
      ref={ref}
      className={cx('ui-DialogBackdrop', className)}
      {...props}
    />
  );
});

const Close = React.forwardRef(function DialogClose(
  { className = '', children, render, ...props },
  ref
) {
  const resolvedRender =
    render ?? (React.isValidElement(children) ? children : undefined);

  return (
    <BaseDialog.Close
      ref={ref}
      render={resolvedRender}
      className={cx('ui-DialogClose', className)}
      {...props}
    >
      {resolvedRender ? undefined : children}
    </BaseDialog.Close>
  );
});

const Description = React.forwardRef(function DialogDescription({ className = '', ...props }, ref) {
  return (
    <BaseDialog.Description
      ref={ref}
      className={cx('ui-DialogDescription', className)}
      {...props}
    />
  );
});

const Handle = React.forwardRef(function DialogHandle({ className = '', ...props }, ref) {
  return (
    <BaseDialog.Handle
      ref={ref}
      className={cx('ui-DialogHandle', className)}
      {...props}
    />
  );
});

const Popup = React.forwardRef(function DialogPopup({ className = '', ...props }, ref) {
  return (
    <BaseDialog.Popup
      ref={ref}
      className={cx('ui-DialogPopup', className)}
      {...props}
    />
  );
});

const Portal = React.forwardRef(function DialogPortal({ className = '', ...props }, ref) {
  return (
    <BaseDialog.Portal
      ref={ref}
      className={cx('ui-DialogPortal', className)}
      {...props}
    />
  );
});

const Root = React.forwardRef(function DialogRoot({ className = '', ...props }, ref) {
  return (
    <BaseDialog.Root
      ref={ref}
      className={cx('ui-DialogRoot', className)}
      {...props}
    />
  );
});

const Title = React.forwardRef(function DialogTitle({ className = '', ...props }, ref) {
  return (
    <BaseDialog.Title
      ref={ref}
      className={cx('ui-DialogTitle', className)}
      {...props}
    />
  );
});

const Trigger = React.forwardRef(function DialogTrigger(
  { className = '', children, render, ...props },
  ref
) {
  const resolvedRender =
    render ?? (React.isValidElement(children) ? children : undefined);

  return (
    <BaseDialog.Trigger
      ref={ref}
      render={resolvedRender}
      className={cx('ui-DialogTrigger', className)}
      {...props}
    >
      {resolvedRender ? undefined : children}
    </BaseDialog.Trigger>
  );
});

const Viewport = React.forwardRef(function DialogViewport({ className = '', ...props }, ref) {
  return (
    <BaseDialog.Viewport
      ref={ref}
      className={cx('ui-DialogViewport', className)}
      {...props}
    />
  );
});

export const Dialog = {
  ...BaseDialog,
  Backdrop, Close, Description, Handle, Popup, Portal, Root, Title, Trigger, Viewport
};
