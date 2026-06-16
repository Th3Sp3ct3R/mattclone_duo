import * as React from 'react';
import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';
import { cx } from '../_utils/cx.js';

const Arrow = React.forwardRef(function TooltipArrow({ className = '', ...props }, ref) {
  return (
    <BaseTooltip.Arrow
      ref={ref}
      className={cx('ui-TooltipArrow', className)}
      {...props}
    />
  );
});

const Handle = React.forwardRef(function TooltipHandle({ className = '', ...props }, ref) {
  return (
    <BaseTooltip.Handle
      ref={ref}
      className={cx('ui-TooltipHandle', className)}
      {...props}
    />
  );
});

const Popup = React.forwardRef(function TooltipPopup({ className = '', ...props }, ref) {
  return (
    <BaseTooltip.Popup
      ref={ref}
      className={cx('ui-TooltipPopup', className)}
      {...props}
    />
  );
});

const Portal = React.forwardRef(function TooltipPortal({ className = '', ...props }, ref) {
  return (
    <BaseTooltip.Portal
      ref={ref}
      className={cx('ui-TooltipPortal', className)}
      {...props}
    />
  );
});

const Positioner = React.forwardRef(function TooltipPositioner({ className = '', ...props }, ref) {
  return (
    <BaseTooltip.Positioner
      ref={ref}
      className={cx('ui-TooltipPositioner', className)}
      {...props}
    />
  );
});

const Provider = React.forwardRef(function TooltipProvider({ className = '', ...props }, ref) {
  return (
    <BaseTooltip.Provider
      ref={ref}
      className={cx('ui-TooltipProvider', className)}
      {...props}
    />
  );
});

const Root = React.forwardRef(function TooltipRoot({ className = '', ...props }, ref) {
  return (
    <BaseTooltip.Root
      ref={ref}
      className={cx('ui-TooltipRoot', className)}
      {...props}
    />
  );
});

const Trigger = React.forwardRef(function TooltipTrigger(
  { className = '', children, render, ...props },
  ref
) {
  const resolvedRender =
    render ?? (React.isValidElement(children) ? children : undefined);

  return (
    <BaseTooltip.Trigger
      ref={ref}
      render={resolvedRender}
      className={cx('ui-TooltipTrigger', className)}
      {...props}
    >
      {resolvedRender ? undefined : children}
    </BaseTooltip.Trigger>
  );
});

const Viewport = React.forwardRef(function TooltipViewport({ className = '', ...props }, ref) {
  return (
    <BaseTooltip.Viewport
      ref={ref}
      className={cx('ui-TooltipViewport', className)}
      {...props}
    />
  );
});

export const Tooltip = {
  ...BaseTooltip,
  Arrow, Handle, Popup, Portal, Positioner, Provider, Root, Trigger, Viewport
};
