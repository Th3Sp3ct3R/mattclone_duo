import * as React from 'react';
import { Toast as BaseToast } from '@base-ui/react/toast';
import { cx } from '../_utils/cx.js';

const Action = React.forwardRef(function ToastAction({ className = '', ...props }, ref) {
  return (
    <BaseToast.Action
      ref={ref}
      className={cx('ui-ToastAction', className)}
      {...props}
    />
  );
});

const Arrow = React.forwardRef(function ToastArrow({ className = '', ...props }, ref) {
  return (
    <BaseToast.Arrow
      ref={ref}
      className={cx('ui-ToastArrow', className)}
      {...props}
    />
  );
});

const Close = React.forwardRef(function ToastClose({ className = '', ...props }, ref) {
  return (
    <BaseToast.Close
      ref={ref}
      className={cx('ui-ToastClose', className)}
      {...props}
    />
  );
});

const Content = React.forwardRef(function ToastContent({ className = '', ...props }, ref) {
  return (
    <BaseToast.Content
      ref={ref}
      className={cx('ui-ToastContent', className)}
      {...props}
    />
  );
});

const Description = React.forwardRef(function ToastDescription({ className = '', ...props }, ref) {
  return (
    <BaseToast.Description
      ref={ref}
      className={cx('ui-ToastDescription', className)}
      {...props}
    />
  );
});

const Portal = React.forwardRef(function ToastPortal({ className = '', ...props }, ref) {
  return (
    <BaseToast.Portal
      ref={ref}
      className={cx('ui-ToastPortal', className)}
      {...props}
    />
  );
});

const Positioner = React.forwardRef(function ToastPositioner({ className = '', ...props }, ref) {
  return (
    <BaseToast.Positioner
      ref={ref}
      className={cx('ui-ToastPositioner', className)}
      {...props}
    />
  );
});

const Provider = React.forwardRef(function ToastProvider({ className = '', ...props }, ref) {
  return (
    <BaseToast.Provider
      ref={ref}
      className={cx('ui-ToastProvider', className)}
      {...props}
    />
  );
});

const Root = React.forwardRef(function ToastRoot({ className = '', ...props }, ref) {
  return (
    <BaseToast.Root
      ref={ref}
      className={cx('ui-ToastRoot', className)}
      {...props}
    />
  );
});

const Title = React.forwardRef(function ToastTitle({ className = '', ...props }, ref) {
  return (
    <BaseToast.Title
      ref={ref}
      className={cx('ui-ToastTitle', className)}
      {...props}
    />
  );
});

const Viewport = React.forwardRef(function ToastViewport({ className = '', ...props }, ref) {
  return (
    <BaseToast.Viewport
      ref={ref}
      className={cx('ui-ToastViewport', className)}
      {...props}
    />
  );
});

export const Toast = {
  ...BaseToast,
  Action, Arrow, Close, Content, Description, Portal, Positioner, Provider, Root, Title, Viewport
};
