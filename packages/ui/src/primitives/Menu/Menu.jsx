import * as React from 'react';
import { Menu as BaseMenu } from '@base-ui/react/menu';
import { cx } from '../_utils/cx.js';

const Arrow = React.forwardRef(function MenuArrow({ className = '', ...props }, ref) {
  return (
    <BaseMenu.Arrow
      ref={ref}
      className={cx('ui-MenuArrow', className)}
      {...props}
    />
  );
});

const Backdrop = React.forwardRef(function MenuBackdrop({ className = '', ...props }, ref) {
  return (
    <BaseMenu.Backdrop
      ref={ref}
      className={cx('ui-MenuBackdrop', className)}
      {...props}
    />
  );
});

const CheckboxItem = React.forwardRef(function MenuCheckboxItem({ className = '', ...props }, ref) {
  return (
    <BaseMenu.CheckboxItem
      ref={ref}
      className={cx('ui-MenuCheckboxItem', className)}
      {...props}
    />
  );
});

const CheckboxItemIndicator = React.forwardRef(function MenuCheckboxItemIndicator({ className = '', ...props }, ref) {
  return (
    <BaseMenu.CheckboxItemIndicator
      ref={ref}
      className={cx('ui-MenuCheckboxItemIndicator', className)}
      {...props}
    />
  );
});

const Group = React.forwardRef(function MenuGroup({ className = '', ...props }, ref) {
  return (
    <BaseMenu.Group
      ref={ref}
      className={cx('ui-MenuGroup', className)}
      {...props}
    />
  );
});

const GroupLabel = React.forwardRef(function MenuGroupLabel({ className = '', ...props }, ref) {
  return (
    <BaseMenu.GroupLabel
      ref={ref}
      className={cx('ui-MenuGroupLabel', className)}
      {...props}
    />
  );
});

const Handle = React.forwardRef(function MenuHandle({ className = '', ...props }, ref) {
  return (
    <BaseMenu.Handle
      ref={ref}
      className={cx('ui-MenuHandle', className)}
      {...props}
    />
  );
});

const Item = React.forwardRef(function MenuItem({ className = '', ...props }, ref) {
  return (
    <BaseMenu.Item
      ref={ref}
      className={cx('ui-MenuItem', className)}
      {...props}
    />
  );
});

const Popup = React.forwardRef(function MenuPopup({ className = '', ...props }, ref) {
  return (
    <BaseMenu.Popup
      ref={ref}
      className={cx('ui-MenuPopup', className)}
      {...props}
    />
  );
});

const Portal = React.forwardRef(function MenuPortal({ className = '', ...props }, ref) {
  return (
    <BaseMenu.Portal
      ref={ref}
      className={cx('ui-MenuPortal', className)}
      {...props}
    />
  );
});

const Positioner = React.forwardRef(function MenuPositioner({ className = '', ...props }, ref) {
  return (
    <BaseMenu.Positioner
      ref={ref}
      className={cx('ui-MenuPositioner', className)}
      {...props}
    />
  );
});

const RadioGroup = React.forwardRef(function MenuRadioGroup({ className = '', ...props }, ref) {
  return (
    <BaseMenu.RadioGroup
      ref={ref}
      className={cx('ui-MenuRadioGroup', className)}
      {...props}
    />
  );
});

const RadioItem = React.forwardRef(function MenuRadioItem({ className = '', ...props }, ref) {
  return (
    <BaseMenu.RadioItem
      ref={ref}
      className={cx('ui-MenuRadioItem', className)}
      {...props}
    />
  );
});

const RadioItemIndicator = React.forwardRef(function MenuRadioItemIndicator({ className = '', ...props }, ref) {
  return (
    <BaseMenu.RadioItemIndicator
      ref={ref}
      className={cx('ui-MenuRadioItemIndicator', className)}
      {...props}
    />
  );
});

const Root = React.forwardRef(function MenuRoot({ className = '', ...props }, ref) {
  return (
    <BaseMenu.Root
      ref={ref}
      className={cx('ui-MenuRoot', className)}
      {...props}
    />
  );
});

const Separator = React.forwardRef(function MenuSeparator({ className = '', ...props }, ref) {
  return (
    <BaseMenu.Separator
      ref={ref}
      className={cx('ui-MenuSeparator', className)}
      {...props}
    />
  );
});

const SubmenuRoot = React.forwardRef(function MenuSubmenuRoot({ className = '', ...props }, ref) {
  return (
    <BaseMenu.SubmenuRoot
      ref={ref}
      className={cx('ui-MenuSubmenuRoot', className)}
      {...props}
    />
  );
});

const SubmenuTrigger = React.forwardRef(function MenuSubmenuTrigger(
  { className = '', children, render, ...props },
  ref
) {
  const resolvedRender =
    render ?? (React.isValidElement(children) ? children : undefined);

  return (
    <BaseMenu.SubmenuTrigger
      ref={ref}
      render={resolvedRender}
      className={cx('ui-MenuSubmenuTrigger', className)}
      {...props}
    >
      {resolvedRender ? undefined : children}
    </BaseMenu.SubmenuTrigger>
  );
});

const Trigger = React.forwardRef(function MenuTrigger(
  { className = '', children, render, ...props },
  ref
) {
  const resolvedRender =
    render ?? (React.isValidElement(children) ? children : undefined);

  return (
    <BaseMenu.Trigger
      ref={ref}
      render={resolvedRender}
      className={cx('ui-MenuTrigger', className)}
      {...props}
    >
      {resolvedRender ? undefined : children}
    </BaseMenu.Trigger>
  );
});

export const Menu = {
  ...BaseMenu,
  Arrow, Backdrop, CheckboxItem, CheckboxItemIndicator, Group, GroupLabel, Handle, Item, Popup, Portal, Positioner, RadioGroup, RadioItem, RadioItemIndicator, Root, Separator, SubmenuRoot, SubmenuTrigger, Trigger
};
