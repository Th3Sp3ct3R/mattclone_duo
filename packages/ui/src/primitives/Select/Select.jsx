import * as React from 'react';
import { Select as BaseSelect } from '@base-ui/react/select';
import { cx } from '../_utils/cx.js';

const Arrow = React.forwardRef(function SelectArrow({ className = '', ...props }, ref) {
  return (
    <BaseSelect.Arrow
      ref={ref}
      className={cx('ui-SelectArrow', className)}
      {...props}
    />
  );
});

const Backdrop = React.forwardRef(function SelectBackdrop({ className = '', ...props }, ref) {
  return (
    <BaseSelect.Backdrop
      ref={ref}
      className={cx('ui-SelectBackdrop', className)}
      {...props}
    />
  );
});

const Group = React.forwardRef(function SelectGroup({ className = '', ...props }, ref) {
  return (
    <BaseSelect.Group
      ref={ref}
      className={cx('ui-SelectGroup', className)}
      {...props}
    />
  );
});

const GroupLabel = React.forwardRef(function SelectGroupLabel({ className = '', ...props }, ref) {
  return (
    <BaseSelect.GroupLabel
      ref={ref}
      className={cx('ui-SelectGroupLabel', className)}
      {...props}
    />
  );
});

const Icon = React.forwardRef(function SelectIcon({ className = '', ...props }, ref) {
  return (
    <BaseSelect.Icon
      ref={ref}
      className={cx('ui-SelectIcon', className)}
      {...props}
    />
  );
});

const Item = React.forwardRef(function SelectItem({ className = '', ...props }, ref) {
  return (
    <BaseSelect.Item
      ref={ref}
      className={cx('ui-SelectItem', className)}
      {...props}
    />
  );
});

const ItemIndicator = React.forwardRef(function SelectItemIndicator({ className = '', ...props }, ref) {
  return (
    <BaseSelect.ItemIndicator
      ref={ref}
      className={cx('ui-SelectItemIndicator', className)}
      {...props}
    />
  );
});

const ItemText = React.forwardRef(function SelectItemText({ className = '', ...props }, ref) {
  return (
    <BaseSelect.ItemText
      ref={ref}
      className={cx('ui-SelectItemText', className)}
      {...props}
    />
  );
});

const List = React.forwardRef(function SelectList({ className = '', ...props }, ref) {
  return (
    <BaseSelect.List
      ref={ref}
      className={cx('ui-SelectList', className)}
      {...props}
    />
  );
});

const Popup = React.forwardRef(function SelectPopup({ className = '', ...props }, ref) {
  return (
    <BaseSelect.Popup
      ref={ref}
      className={cx('ui-SelectPopup', className)}
      {...props}
    />
  );
});

const Portal = React.forwardRef(function SelectPortal({ className = '', ...props }, ref) {
  return (
    <BaseSelect.Portal
      ref={ref}
      className={cx('ui-SelectPortal', className)}
      {...props}
    />
  );
});

const Positioner = React.forwardRef(function SelectPositioner({ className = '', ...props }, ref) {
  return (
    <BaseSelect.Positioner
      ref={ref}
      className={cx('ui-SelectPositioner', className)}
      {...props}
    />
  );
});

const Root = React.forwardRef(function SelectRoot({ className = '', ...props }, ref) {
  return (
    <BaseSelect.Root
      ref={ref}
      className={cx('ui-SelectRoot', className)}
      {...props}
    />
  );
});

const ScrollDownArrow = React.forwardRef(function SelectScrollDownArrow({ className = '', ...props }, ref) {
  return (
    <BaseSelect.ScrollDownArrow
      ref={ref}
      className={cx('ui-SelectScrollDownArrow', className)}
      {...props}
    />
  );
});

const ScrollUpArrow = React.forwardRef(function SelectScrollUpArrow({ className = '', ...props }, ref) {
  return (
    <BaseSelect.ScrollUpArrow
      ref={ref}
      className={cx('ui-SelectScrollUpArrow', className)}
      {...props}
    />
  );
});

const Separator = React.forwardRef(function SelectSeparator({ className = '', ...props }, ref) {
  return (
    <BaseSelect.Separator
      ref={ref}
      className={cx('ui-SelectSeparator', className)}
      {...props}
    />
  );
});

const Trigger = React.forwardRef(function SelectTrigger(
  { className = '', children, render, ...props },
  ref
) {
  const resolvedRender =
    render ?? (React.isValidElement(children) ? children : undefined);

  return (
    <BaseSelect.Trigger
      ref={ref}
      render={resolvedRender}
      className={cx('ui-SelectTrigger', className)}
      {...props}
    >
      {resolvedRender ? undefined : children}
    </BaseSelect.Trigger>
  );
});

const Value = React.forwardRef(function SelectValue({ className = '', ...props }, ref) {
  return (
    <BaseSelect.Value
      ref={ref}
      className={cx('ui-SelectValue', className)}
      {...props}
    />
  );
});

export const Select = {
  ...BaseSelect,
  Arrow, Backdrop, Group, GroupLabel, Icon, Item, ItemIndicator, ItemText, List, Popup, Portal, Positioner, Root, ScrollDownArrow, ScrollUpArrow, Separator, Trigger, Value
};
