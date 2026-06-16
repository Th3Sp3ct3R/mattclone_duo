import * as React from 'react';
import { Collapsible as BaseCollapsible } from '@base-ui/react/collapsible';
import { cx } from '../_utils/cx.js';

const Panel = React.forwardRef(function CollapsiblePanel({ className = '', ...props }, ref) {
  return (
    <BaseCollapsible.Panel
      ref={ref}
      className={cx('ui-CollapsiblePanel', className)}
      {...props}
    />
  );
});

const Root = React.forwardRef(function CollapsibleRoot({ className = '', ...props }, ref) {
  return (
    <BaseCollapsible.Root
      ref={ref}
      className={cx('ui-CollapsibleRoot', className)}
      {...props}
    />
  );
});

const Trigger = React.forwardRef(function CollapsibleTrigger(
  { className = '', children, render, ...props },
  ref
) {
  const resolvedRender =
    render ?? (React.isValidElement(children) ? children : undefined);

  return (
    <BaseCollapsible.Trigger
      ref={ref}
      render={resolvedRender}
      className={cx('ui-CollapsibleTrigger', className)}
      {...props}
    >
      {resolvedRender ? undefined : children}
    </BaseCollapsible.Trigger>
  );
});

export const Collapsible = {
  ...BaseCollapsible,
  Panel, Root, Trigger
};
