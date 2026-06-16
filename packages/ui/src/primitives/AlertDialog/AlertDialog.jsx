import * as React from 'react';
import { AlertDialog as BaseAlertDialog } from '@base-ui/react/alert-dialog';
import { cx } from '../_utils/cx.js';

const Backdrop = React.forwardRef(function AlertDialogBackdrop({ className = '', ...props }, ref) {
  return (
    <BaseAlertDialog.Backdrop
      ref={ref}
      className={cx('ui-AlertDialogBackdrop', className)}
      {...props}
    />
  );
});

const Close = React.forwardRef(function AlertDialogClose(
  { className = '', children, render, ...props },
  ref
) {
  const resolvedRender =
    render ?? (React.isValidElement(children) ? children : undefined);

  return (
    <BaseAlertDialog.Close
      ref={ref}
      render={resolvedRender}
      className={cx('ui-AlertDialogClose', className)}
      {...props}
    >
      {resolvedRender ? undefined : children}
    </BaseAlertDialog.Close>
  );
});

const Description = React.forwardRef(function AlertDialogDescription({ className = '', ...props }, ref) {
  return (
    <BaseAlertDialog.Description
      ref={ref}
      className={cx('ui-AlertDialogDescription', className)}
      {...props}
    />
  );
});

const Handle = React.forwardRef(function AlertDialogHandle({ className = '', ...props }, ref) {
  return (
    <BaseAlertDialog.Handle
      ref={ref}
      className={cx('ui-AlertDialogHandle', className)}
      {...props}
    />
  );
});

const Popup = React.forwardRef(function AlertDialogPopup({ className = '', ...props }, ref) {
  return (
    <BaseAlertDialog.Popup
      ref={ref}
      className={cx('ui-AlertDialogPopup', className)}
      {...props}
    />
  );
});

const Portal = React.forwardRef(function AlertDialogPortal({ className = '', ...props }, ref) {
  return (
    <BaseAlertDialog.Portal
      ref={ref}
      className={cx('ui-AlertDialogPortal', className)}
      {...props}
    />
  );
});

const Root = React.forwardRef(function AlertDialogRoot({ className = '', ...props }, ref) {
  return (
    <BaseAlertDialog.Root
      ref={ref}
      className={cx('ui-AlertDialogRoot', className)}
      {...props}
    />
  );
});

const Title = React.forwardRef(function AlertDialogTitle({ className = '', ...props }, ref) {
  return (
    <BaseAlertDialog.Title
      ref={ref}
      className={cx('ui-AlertDialogTitle', className)}
      {...props}
    />
  );
});

const Trigger = React.forwardRef(function AlertDialogTrigger(
  { className = '', children, render, ...props },
  ref
) {
  const resolvedRender =
    render ?? (React.isValidElement(children) ? children : undefined);

  return (
    <BaseAlertDialog.Trigger
      ref={ref}
      render={resolvedRender}
      className={cx('ui-AlertDialogTrigger', className)}
      {...props}
    >
      {resolvedRender ? undefined : children}
    </BaseAlertDialog.Trigger>
  );
});

const Viewport = React.forwardRef(function AlertDialogViewport({ className = '', ...props }, ref) {
  return (
    <BaseAlertDialog.Viewport
      ref={ref}
      className={cx('ui-AlertDialogViewport', className)}
      {...props}
    />
  );
});

export const AlertDialog = {
  ...BaseAlertDialog,
  Backdrop, Close, Description, Handle, Popup, Portal, Root, Title, Trigger, Viewport
};
