import * as React from 'react';
import { ContextMenu as BaseContextMenu } from '@base-ui/react/context-menu';
import { cx } from '../_utils/cx.js';

const Arrow = React.forwardRef(function ContextMenuArrow({ className = '', ...props }, ref) {
  return (
    <BaseContextMenu.Arrow
      ref={ref}
      className={cx('ui-ContextMenuArrow', className)}
      {...props}
    />
  );
});

const Backdrop = React.forwardRef(function ContextMenuBackdrop({ className = '', ...props }, ref) {
  return (
    <BaseContextMenu.Backdrop
      ref={ref}
      className={cx('ui-ContextMenuBackdrop', className)}
      {...props}
    />
  );
});

const CheckboxItem = React.forwardRef(function ContextMenuCheckboxItem({ className = '', ...props }, ref) {
  return (
    <BaseContextMenu.CheckboxItem
      ref={ref}
      className={cx('ui-ContextMenuCheckboxItem', className)}
      {...props}
    />
  );
});

const CheckboxItemIndicator = React.forwardRef(function ContextMenuCheckboxItemIndicator({ className = '', ...props }, ref) {
  return (
    <BaseContextMenu.CheckboxItemIndicator
      ref={ref}
      className={cx('ui-ContextMenuCheckboxItemIndicator', className)}
      {...props}
    />
  );
});

const Group = React.forwardRef(function ContextMenuGroup({ className = '', ...props }, ref) {
  return (
    <BaseContextMenu.Group
      ref={ref}
      className={cx('ui-ContextMenuGroup', className)}
      {...props}
    />
  );
});

const GroupLabel = React.forwardRef(function ContextMenuGroupLabel({ className = '', ...props }, ref) {
  return (
    <BaseContextMenu.GroupLabel
      ref={ref}
      className={cx('ui-ContextMenuGroupLabel', className)}
      {...props}
    />
  );
});

const Item = React.forwardRef(function ContextMenuItem({ className = '', ...props }, ref) {
  return (
    <BaseContextMenu.Item
      ref={ref}
      className={cx('ui-ContextMenuItem', className)}
      {...props}
    />
  );
});

const Popup = React.forwardRef(function ContextMenuPopup({ className = '', ...props }, ref) {
  return (
    <BaseContextMenu.Popup
      ref={ref}
      className={cx('ui-ContextMenuPopup', className)}
      {...props}
    />
  );
});

const Portal = React.forwardRef(function ContextMenuPortal({ className = '', ...props }, ref) {
  return (
    <BaseContextMenu.Portal
      ref={ref}
      className={cx('ui-ContextMenuPortal', className)}
      {...props}
    />
  );
});

const Positioner = React.forwardRef(function ContextMenuPositioner({ className = '', ...props }, ref) {
  return (
    <BaseContextMenu.Positioner
      ref={ref}
      className={cx('ui-ContextMenuPositioner', className)}
      {...props}
    />
  );
});

const RadioGroup = React.forwardRef(function ContextMenuRadioGroup({ className = '', ...props }, ref) {
  return (
    <BaseContextMenu.RadioGroup
      ref={ref}
      className={cx('ui-ContextMenuRadioGroup', className)}
      {...props}
    />
  );
});

const RadioItem = React.forwardRef(function ContextMenuRadioItem({ className = '', ...props }, ref) {
  return (
    <BaseContextMenu.RadioItem
      ref={ref}
      className={cx('ui-ContextMenuRadioItem', className)}
      {...props}
    />
  );
});

const RadioItemIndicator = React.forwardRef(function ContextMenuRadioItemIndicator({ className = '', ...props }, ref) {
  return (
    <BaseContextMenu.RadioItemIndicator
      ref={ref}
      className={cx('ui-ContextMenuRadioItemIndicator', className)}
      {...props}
    />
  );
});

const Root = React.forwardRef(function ContextMenuRoot({ className = '', ...props }, ref) {
  return (
    <BaseContextMenu.Root
      ref={ref}
      className={cx('ui-ContextMenuRoot', className)}
      {...props}
    />
  );
});

const Separator = React.forwardRef(function ContextMenuSeparator({ className = '', ...props }, ref) {
  return (
    <BaseContextMenu.Separator
      ref={ref}
      className={cx('ui-ContextMenuSeparator', className)}
      {...props}
    />
  );
});

const SubmenuRoot = React.forwardRef(function ContextMenuSubmenuRoot({ className = '', ...props }, ref) {
  return (
    <BaseContextMenu.SubmenuRoot
      ref={ref}
      className={cx('ui-ContextMenuSubmenuRoot', className)}
      {...props}
    />
  );
});

const SubmenuTrigger = React.forwardRef(function ContextMenuSubmenuTrigger(
  { className = '', children, render, ...props },
  ref
) {
  const resolvedRender =
    render ?? (React.isValidElement(children) ? children : undefined);

  return (
    <BaseContextMenu.SubmenuTrigger
      ref={ref}
      render={resolvedRender}
      className={cx('ui-ContextMenuSubmenuTrigger', className)}
      {...props}
    >
      {resolvedRender ? undefined : children}
    </BaseContextMenu.SubmenuTrigger>
  );
});

const Trigger = React.forwardRef(function ContextMenuTrigger(
  { className = '', children, render, ...props },
  ref
) {
  const resolvedRender =
    render ?? (React.isValidElement(children) ? children : undefined);

  return (
    <BaseContextMenu.Trigger
      ref={ref}
      render={resolvedRender}
      className={cx('ui-ContextMenuTrigger', className)}
      {...props}
    >
      {resolvedRender ? undefined : children}
    </BaseContextMenu.Trigger>
  );
});

export const ContextMenu = {
  ...BaseContextMenu,
  Arrow, Backdrop, CheckboxItem, CheckboxItemIndicator, Group, GroupLabel, Item, Popup, Portal, Positioner, RadioGroup, RadioItem, RadioItemIndicator, Root, Separator, SubmenuRoot, SubmenuTrigger, Trigger
};
