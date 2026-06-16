import * as React from 'react';
import { NavigationMenu as BaseNavigationMenu } from '@base-ui/react/navigation-menu';
import { cx } from '../_utils/cx.js';

const Arrow = React.forwardRef(function NavigationMenuArrow({ className = '', ...props }, ref) {
  return (
    <BaseNavigationMenu.Arrow
      ref={ref}
      className={cx('ui-NavigationMenuArrow', className)}
      {...props}
    />
  );
});

const Backdrop = React.forwardRef(function NavigationMenuBackdrop({ className = '', ...props }, ref) {
  return (
    <BaseNavigationMenu.Backdrop
      ref={ref}
      className={cx('ui-NavigationMenuBackdrop', className)}
      {...props}
    />
  );
});

const Content = React.forwardRef(function NavigationMenuContent({ className = '', ...props }, ref) {
  return (
    <BaseNavigationMenu.Content
      ref={ref}
      className={cx('ui-NavigationMenuContent', className)}
      {...props}
    />
  );
});

const Icon = React.forwardRef(function NavigationMenuIcon({ className = '', ...props }, ref) {
  return (
    <BaseNavigationMenu.Icon
      ref={ref}
      className={cx('ui-NavigationMenuIcon', className)}
      {...props}
    />
  );
});

const Item = React.forwardRef(function NavigationMenuItem({ className = '', ...props }, ref) {
  return (
    <BaseNavigationMenu.Item
      ref={ref}
      className={cx('ui-NavigationMenuItem', className)}
      {...props}
    />
  );
});

const Link = React.forwardRef(function NavigationMenuLink({ className = '', ...props }, ref) {
  return (
    <BaseNavigationMenu.Link
      ref={ref}
      className={cx('ui-NavigationMenuLink', className)}
      {...props}
    />
  );
});

const List = React.forwardRef(function NavigationMenuList({ className = '', ...props }, ref) {
  return (
    <BaseNavigationMenu.List
      ref={ref}
      className={cx('ui-NavigationMenuList', className)}
      {...props}
    />
  );
});

const Popup = React.forwardRef(function NavigationMenuPopup({ className = '', ...props }, ref) {
  return (
    <BaseNavigationMenu.Popup
      ref={ref}
      className={cx('ui-NavigationMenuPopup', className)}
      {...props}
    />
  );
});

const Portal = React.forwardRef(function NavigationMenuPortal({ className = '', ...props }, ref) {
  return (
    <BaseNavigationMenu.Portal
      ref={ref}
      className={cx('ui-NavigationMenuPortal', className)}
      {...props}
    />
  );
});

const Positioner = React.forwardRef(function NavigationMenuPositioner({ className = '', ...props }, ref) {
  return (
    <BaseNavigationMenu.Positioner
      ref={ref}
      className={cx('ui-NavigationMenuPositioner', className)}
      {...props}
    />
  );
});

const Root = React.forwardRef(function NavigationMenuRoot({ className = '', ...props }, ref) {
  return (
    <BaseNavigationMenu.Root
      ref={ref}
      className={cx('ui-NavigationMenuRoot', className)}
      {...props}
    />
  );
});

const Trigger = React.forwardRef(function NavigationMenuTrigger(
  { className = '', children, render, ...props },
  ref
) {
  const resolvedRender =
    render ?? (React.isValidElement(children) ? children : undefined);

  return (
    <BaseNavigationMenu.Trigger
      ref={ref}
      render={resolvedRender}
      className={cx('ui-NavigationMenuTrigger', className)}
      {...props}
    >
      {resolvedRender ? undefined : children}
    </BaseNavigationMenu.Trigger>
  );
});

const Viewport = React.forwardRef(function NavigationMenuViewport({ className = '', ...props }, ref) {
  return (
    <BaseNavigationMenu.Viewport
      ref={ref}
      className={cx('ui-NavigationMenuViewport', className)}
      {...props}
    />
  );
});

export const NavigationMenu = {
  ...BaseNavigationMenu,
  Arrow, Backdrop, Content, Icon, Item, Link, List, Popup, Portal, Positioner, Root, Trigger, Viewport
};
