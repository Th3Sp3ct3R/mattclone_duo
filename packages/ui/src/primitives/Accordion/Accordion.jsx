import * as React from 'react';
import { Accordion as BaseAccordion } from '@base-ui/react/accordion';
import { cx } from '../_utils/cx.js';

const Header = React.forwardRef(function AccordionHeader({ className = '', ...props }, ref) {
  return (
    <BaseAccordion.Header
      ref={ref}
      className={cx('ui-AccordionHeader', className)}
      {...props}
    />
  );
});

const Item = React.forwardRef(function AccordionItem({ className = '', ...props }, ref) {
  return (
    <BaseAccordion.Item
      ref={ref}
      className={cx('ui-AccordionItem', className)}
      {...props}
    />
  );
});

const Panel = React.forwardRef(function AccordionPanel({ className = '', ...props }, ref) {
  return (
    <BaseAccordion.Panel
      ref={ref}
      className={cx('ui-AccordionPanel', className)}
      {...props}
    />
  );
});

const Root = React.forwardRef(function AccordionRoot({ className = '', ...props }, ref) {
  return (
    <BaseAccordion.Root
      ref={ref}
      className={cx('ui-AccordionRoot', className)}
      {...props}
    />
  );
});

const Trigger = React.forwardRef(function AccordionTrigger(
  { className = '', children, render, ...props },
  ref
) {
  const resolvedRender =
    render ?? (React.isValidElement(children) ? children : undefined);

  return (
    <BaseAccordion.Trigger
      ref={ref}
      render={resolvedRender}
      className={cx('ui-AccordionTrigger', className)}
      {...props}
    >
      {resolvedRender ? undefined : children}
    </BaseAccordion.Trigger>
  );
});

export const Accordion = {
  ...BaseAccordion,
  Header, Item, Panel, Root, Trigger
};
