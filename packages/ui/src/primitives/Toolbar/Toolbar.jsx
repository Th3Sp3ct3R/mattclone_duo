import * as React from 'react';
import { Toolbar as BaseToolbar } from '@base-ui/react/toolbar';
import { cx } from '../_utils/cx.js';

const Button = React.forwardRef(function ToolbarButton({ className = '', ...props }, ref) {
  return (
    <BaseToolbar.Button
      ref={ref}
      className={cx('ui-ToolbarButton', className)}
      {...props}
    />
  );
});

const Group = React.forwardRef(function ToolbarGroup({ className = '', ...props }, ref) {
  return (
    <BaseToolbar.Group
      ref={ref}
      className={cx('ui-ToolbarGroup', className)}
      {...props}
    />
  );
});

const Input = React.forwardRef(function ToolbarInput({ className = '', ...props }, ref) {
  return (
    <BaseToolbar.Input
      ref={ref}
      className={cx('ui-ToolbarInput', className)}
      {...props}
    />
  );
});

const Link = React.forwardRef(function ToolbarLink({ className = '', ...props }, ref) {
  return (
    <BaseToolbar.Link
      ref={ref}
      className={cx('ui-ToolbarLink', className)}
      {...props}
    />
  );
});

const Root = React.forwardRef(function ToolbarRoot({ className = '', ...props }, ref) {
  return (
    <BaseToolbar.Root
      ref={ref}
      className={cx('ui-ToolbarRoot', className)}
      {...props}
    />
  );
});

const Separator = React.forwardRef(function ToolbarSeparator({ className = '', ...props }, ref) {
  return (
    <BaseToolbar.Separator
      ref={ref}
      className={cx('ui-ToolbarSeparator', className)}
      {...props}
    />
  );
});

export const Toolbar = {
  ...BaseToolbar,
  Button, Group, Input, Link, Root, Separator
};
