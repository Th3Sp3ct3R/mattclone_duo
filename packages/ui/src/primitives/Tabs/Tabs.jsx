import * as React from 'react';
import { Tabs as BaseTabs } from '@base-ui/react/tabs';
import { cx } from '../_utils/cx.js';

const Indicator = React.forwardRef(function TabsIndicator({ className = '', ...props }, ref) {
  return (
    <BaseTabs.Indicator
      ref={ref}
      className={cx('ui-TabsIndicator', className)}
      {...props}
    />
  );
});

const List = React.forwardRef(function TabsList({ className = '', ...props }, ref) {
  return (
    <BaseTabs.List
      ref={ref}
      className={cx('ui-TabsList', className)}
      {...props}
    />
  );
});

const Panel = React.forwardRef(function TabsPanel({ className = '', ...props }, ref) {
  return (
    <BaseTabs.Panel
      ref={ref}
      className={cx('ui-TabsPanel', className)}
      {...props}
    />
  );
});

const Root = React.forwardRef(function TabsRoot({ className = '', ...props }, ref) {
  return (
    <BaseTabs.Root
      ref={ref}
      className={cx('ui-TabsRoot', className)}
      {...props}
    />
  );
});

const Tab = React.forwardRef(function TabsTab({ className = '', ...props }, ref) {
  return (
    <BaseTabs.Tab
      ref={ref}
      className={cx('ui-TabsTab', className)}
      {...props}
    />
  );
});

export const Tabs = {
  ...BaseTabs,
  Indicator, List, Panel, Root, Tab
};
