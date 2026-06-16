import * as React from 'react';
import { PreviewCard as BasePreviewCard } from '@base-ui/react/preview-card';
import { cx } from '../_utils/cx.js';

const Arrow = React.forwardRef(function PreviewCardArrow({ className = '', ...props }, ref) {
  return (
    <BasePreviewCard.Arrow
      ref={ref}
      className={cx('ui-PreviewCardArrow', className)}
      {...props}
    />
  );
});

const Backdrop = React.forwardRef(function PreviewCardBackdrop({ className = '', ...props }, ref) {
  return (
    <BasePreviewCard.Backdrop
      ref={ref}
      className={cx('ui-PreviewCardBackdrop', className)}
      {...props}
    />
  );
});

const Popup = React.forwardRef(function PreviewCardPopup({ className = '', ...props }, ref) {
  return (
    <BasePreviewCard.Popup
      ref={ref}
      className={cx('ui-PreviewCardPopup', className)}
      {...props}
    />
  );
});

const Portal = React.forwardRef(function PreviewCardPortal({ className = '', ...props }, ref) {
  return (
    <BasePreviewCard.Portal
      ref={ref}
      className={cx('ui-PreviewCardPortal', className)}
      {...props}
    />
  );
});

const Positioner = React.forwardRef(function PreviewCardPositioner({ className = '', ...props }, ref) {
  return (
    <BasePreviewCard.Positioner
      ref={ref}
      className={cx('ui-PreviewCardPositioner', className)}
      {...props}
    />
  );
});

const Root = React.forwardRef(function PreviewCardRoot({ className = '', ...props }, ref) {
  return (
    <BasePreviewCard.Root
      ref={ref}
      className={cx('ui-PreviewCardRoot', className)}
      {...props}
    />
  );
});

const Trigger = React.forwardRef(function PreviewCardTrigger(
  { className = '', children, render, ...props },
  ref
) {
  const resolvedRender =
    render ?? (React.isValidElement(children) ? children : undefined);

  return (
    <BasePreviewCard.Trigger
      ref={ref}
      render={resolvedRender}
      className={cx('ui-PreviewCardTrigger', className)}
      {...props}
    >
      {resolvedRender ? undefined : children}
    </BasePreviewCard.Trigger>
  );
});

export const PreviewCard = {
  ...BasePreviewCard,
  Arrow, Backdrop, Popup, Portal, Positioner, Root, Trigger
};
