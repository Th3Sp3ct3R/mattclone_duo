import * as React from 'react';
import { Autocomplete as BaseAutocomplete } from '@base-ui/react/autocomplete';
import { cx } from '../_utils/cx.js';

const Arrow = React.forwardRef(function AutocompleteArrow({ className = '', ...props }, ref) {
  return (
    <BaseAutocomplete.Arrow
      ref={ref}
      className={cx('ui-AutocompleteArrow', className)}
      {...props}
    />
  );
});

const Backdrop = React.forwardRef(function AutocompleteBackdrop({ className = '', ...props }, ref) {
  return (
    <BaseAutocomplete.Backdrop
      ref={ref}
      className={cx('ui-AutocompleteBackdrop', className)}
      {...props}
    />
  );
});

const Clear = React.forwardRef(function AutocompleteClear({ className = '', ...props }, ref) {
  return (
    <BaseAutocomplete.Clear
      ref={ref}
      className={cx('ui-AutocompleteClear', className)}
      {...props}
    />
  );
});

const Collection = React.forwardRef(function AutocompleteCollection({ className = '', ...props }, ref) {
  return (
    <BaseAutocomplete.Collection
      ref={ref}
      className={cx('ui-AutocompleteCollection', className)}
      {...props}
    />
  );
});

const Empty = React.forwardRef(function AutocompleteEmpty({ className = '', ...props }, ref) {
  return (
    <BaseAutocomplete.Empty
      ref={ref}
      className={cx('ui-AutocompleteEmpty', className)}
      {...props}
    />
  );
});

const Group = React.forwardRef(function AutocompleteGroup({ className = '', ...props }, ref) {
  return (
    <BaseAutocomplete.Group
      ref={ref}
      className={cx('ui-AutocompleteGroup', className)}
      {...props}
    />
  );
});

const GroupLabel = React.forwardRef(function AutocompleteGroupLabel({ className = '', ...props }, ref) {
  return (
    <BaseAutocomplete.GroupLabel
      ref={ref}
      className={cx('ui-AutocompleteGroupLabel', className)}
      {...props}
    />
  );
});

const Icon = React.forwardRef(function AutocompleteIcon({ className = '', ...props }, ref) {
  return (
    <BaseAutocomplete.Icon
      ref={ref}
      className={cx('ui-AutocompleteIcon', className)}
      {...props}
    />
  );
});

const Input = React.forwardRef(function AutocompleteInput({ className = '', ...props }, ref) {
  return (
    <BaseAutocomplete.Input
      ref={ref}
      className={cx('ui-AutocompleteInput', className)}
      {...props}
    />
  );
});

const Item = React.forwardRef(function AutocompleteItem({ className = '', ...props }, ref) {
  return (
    <BaseAutocomplete.Item
      ref={ref}
      className={cx('ui-AutocompleteItem', className)}
      {...props}
    />
  );
});

const List = React.forwardRef(function AutocompleteList({ className = '', ...props }, ref) {
  return (
    <BaseAutocomplete.List
      ref={ref}
      className={cx('ui-AutocompleteList', className)}
      {...props}
    />
  );
});

const Popup = React.forwardRef(function AutocompletePopup({ className = '', ...props }, ref) {
  return (
    <BaseAutocomplete.Popup
      ref={ref}
      className={cx('ui-AutocompletePopup', className)}
      {...props}
    />
  );
});

const Portal = React.forwardRef(function AutocompletePortal({ className = '', ...props }, ref) {
  return (
    <BaseAutocomplete.Portal
      ref={ref}
      className={cx('ui-AutocompletePortal', className)}
      {...props}
    />
  );
});

const Positioner = React.forwardRef(function AutocompletePositioner({ className = '', ...props }, ref) {
  return (
    <BaseAutocomplete.Positioner
      ref={ref}
      className={cx('ui-AutocompletePositioner', className)}
      {...props}
    />
  );
});

const Root = React.forwardRef(function AutocompleteRoot({ className = '', ...props }, ref) {
  return (
    <BaseAutocomplete.Root
      ref={ref}
      className={cx('ui-AutocompleteRoot', className)}
      {...props}
    />
  );
});

const Row = React.forwardRef(function AutocompleteRow({ className = '', ...props }, ref) {
  return (
    <BaseAutocomplete.Row
      ref={ref}
      className={cx('ui-AutocompleteRow', className)}
      {...props}
    />
  );
});

const Separator = React.forwardRef(function AutocompleteSeparator({ className = '', ...props }, ref) {
  return (
    <BaseAutocomplete.Separator
      ref={ref}
      className={cx('ui-AutocompleteSeparator', className)}
      {...props}
    />
  );
});

const Status = React.forwardRef(function AutocompleteStatus({ className = '', ...props }, ref) {
  return (
    <BaseAutocomplete.Status
      ref={ref}
      className={cx('ui-AutocompleteStatus', className)}
      {...props}
    />
  );
});

const Trigger = React.forwardRef(function AutocompleteTrigger(
  { className = '', children, render, ...props },
  ref
) {
  const resolvedRender =
    render ?? (React.isValidElement(children) ? children : undefined);

  return (
    <BaseAutocomplete.Trigger
      ref={ref}
      render={resolvedRender}
      className={cx('ui-AutocompleteTrigger', className)}
      {...props}
    >
      {resolvedRender ? undefined : children}
    </BaseAutocomplete.Trigger>
  );
});

const Value = React.forwardRef(function AutocompleteValue({ className = '', ...props }, ref) {
  return (
    <BaseAutocomplete.Value
      ref={ref}
      className={cx('ui-AutocompleteValue', className)}
      {...props}
    />
  );
});

export const Autocomplete = {
  ...BaseAutocomplete,
  Arrow, Backdrop, Clear, Collection, Empty, Group, GroupLabel, Icon, Input, Item, List, Popup, Portal, Positioner, Root, Row, Separator, Status, Trigger, Value
};
