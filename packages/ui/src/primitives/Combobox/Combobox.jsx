import * as React from 'react';
import { Combobox as BaseCombobox } from '@base-ui/react/combobox';
import { cx } from '../_utils/cx.js';

const Arrow = React.forwardRef(function ComboboxArrow({ className = '', ...props }, ref) {
  return (
    <BaseCombobox.Arrow
      ref={ref}
      className={cx('ui-ComboboxArrow', className)}
      {...props}
    />
  );
});

const Backdrop = React.forwardRef(function ComboboxBackdrop({ className = '', ...props }, ref) {
  return (
    <BaseCombobox.Backdrop
      ref={ref}
      className={cx('ui-ComboboxBackdrop', className)}
      {...props}
    />
  );
});

const Chip = React.forwardRef(function ComboboxChip({ className = '', ...props }, ref) {
  return (
    <BaseCombobox.Chip
      ref={ref}
      className={cx('ui-ComboboxChip', className)}
      {...props}
    />
  );
});

const ChipRemove = React.forwardRef(function ComboboxChipRemove({ className = '', ...props }, ref) {
  return (
    <BaseCombobox.ChipRemove
      ref={ref}
      className={cx('ui-ComboboxChipRemove', className)}
      {...props}
    />
  );
});

const Chips = React.forwardRef(function ComboboxChips({ className = '', ...props }, ref) {
  return (
    <BaseCombobox.Chips
      ref={ref}
      className={cx('ui-ComboboxChips', className)}
      {...props}
    />
  );
});

const Clear = React.forwardRef(function ComboboxClear({ className = '', ...props }, ref) {
  return (
    <BaseCombobox.Clear
      ref={ref}
      className={cx('ui-ComboboxClear', className)}
      {...props}
    />
  );
});

const Collection = React.forwardRef(function ComboboxCollection({ className = '', ...props }, ref) {
  return (
    <BaseCombobox.Collection
      ref={ref}
      className={cx('ui-ComboboxCollection', className)}
      {...props}
    />
  );
});

const Empty = React.forwardRef(function ComboboxEmpty({ className = '', ...props }, ref) {
  return (
    <BaseCombobox.Empty
      ref={ref}
      className={cx('ui-ComboboxEmpty', className)}
      {...props}
    />
  );
});

const Group = React.forwardRef(function ComboboxGroup({ className = '', ...props }, ref) {
  return (
    <BaseCombobox.Group
      ref={ref}
      className={cx('ui-ComboboxGroup', className)}
      {...props}
    />
  );
});

const GroupLabel = React.forwardRef(function ComboboxGroupLabel({ className = '', ...props }, ref) {
  return (
    <BaseCombobox.GroupLabel
      ref={ref}
      className={cx('ui-ComboboxGroupLabel', className)}
      {...props}
    />
  );
});

const Icon = React.forwardRef(function ComboboxIcon({ className = '', ...props }, ref) {
  return (
    <BaseCombobox.Icon
      ref={ref}
      className={cx('ui-ComboboxIcon', className)}
      {...props}
    />
  );
});

const Input = React.forwardRef(function ComboboxInput({ className = '', ...props }, ref) {
  return (
    <BaseCombobox.Input
      ref={ref}
      className={cx('ui-ComboboxInput', className)}
      {...props}
    />
  );
});

const Item = React.forwardRef(function ComboboxItem({ className = '', ...props }, ref) {
  return (
    <BaseCombobox.Item
      ref={ref}
      className={cx('ui-ComboboxItem', className)}
      {...props}
    />
  );
});

const ItemIndicator = React.forwardRef(function ComboboxItemIndicator({ className = '', ...props }, ref) {
  return (
    <BaseCombobox.ItemIndicator
      ref={ref}
      className={cx('ui-ComboboxItemIndicator', className)}
      {...props}
    />
  );
});

const List = React.forwardRef(function ComboboxList({ className = '', ...props }, ref) {
  return (
    <BaseCombobox.List
      ref={ref}
      className={cx('ui-ComboboxList', className)}
      {...props}
    />
  );
});

const Popup = React.forwardRef(function ComboboxPopup({ className = '', ...props }, ref) {
  return (
    <BaseCombobox.Popup
      ref={ref}
      className={cx('ui-ComboboxPopup', className)}
      {...props}
    />
  );
});

const Portal = React.forwardRef(function ComboboxPortal({ className = '', ...props }, ref) {
  return (
    <BaseCombobox.Portal
      ref={ref}
      className={cx('ui-ComboboxPortal', className)}
      {...props}
    />
  );
});

const Positioner = React.forwardRef(function ComboboxPositioner({ className = '', ...props }, ref) {
  return (
    <BaseCombobox.Positioner
      ref={ref}
      className={cx('ui-ComboboxPositioner', className)}
      {...props}
    />
  );
});

const Root = React.forwardRef(function ComboboxRoot({ className = '', ...props }, ref) {
  return (
    <BaseCombobox.Root
      ref={ref}
      className={cx('ui-ComboboxRoot', className)}
      {...props}
    />
  );
});

const Row = React.forwardRef(function ComboboxRow({ className = '', ...props }, ref) {
  return (
    <BaseCombobox.Row
      ref={ref}
      className={cx('ui-ComboboxRow', className)}
      {...props}
    />
  );
});

const Separator = React.forwardRef(function ComboboxSeparator({ className = '', ...props }, ref) {
  return (
    <BaseCombobox.Separator
      ref={ref}
      className={cx('ui-ComboboxSeparator', className)}
      {...props}
    />
  );
});

const Status = React.forwardRef(function ComboboxStatus({ className = '', ...props }, ref) {
  return (
    <BaseCombobox.Status
      ref={ref}
      className={cx('ui-ComboboxStatus', className)}
      {...props}
    />
  );
});

const Trigger = React.forwardRef(function ComboboxTrigger(
  { className = '', children, render, ...props },
  ref
) {
  const resolvedRender =
    render ?? (React.isValidElement(children) ? children : undefined);

  return (
    <BaseCombobox.Trigger
      ref={ref}
      render={resolvedRender}
      className={cx('ui-ComboboxTrigger', className)}
      {...props}
    >
      {resolvedRender ? undefined : children}
    </BaseCombobox.Trigger>
  );
});

const Value = React.forwardRef(function ComboboxValue({ className = '', ...props }, ref) {
  return (
    <BaseCombobox.Value
      ref={ref}
      className={cx('ui-ComboboxValue', className)}
      {...props}
    />
  );
});

export const Combobox = {
  ...BaseCombobox,
  Arrow, Backdrop, Chip, ChipRemove, Chips, Clear, Collection, Empty, Group, GroupLabel, Icon, Input, Item, ItemIndicator, List, Popup, Portal, Positioner, Root, Row, Separator, Status, Trigger, Value
};
