import * as React from 'react';
import { ToggleGroup as BaseToggleGroup } from '@base-ui/react/toggle-group';
import { cx } from '../_utils/cx.js';

export const ToggleGroup = React.forwardRef(function ToggleGroup(
  { className = '',  ...props },
  ref
) {
  const cls = cx('ui-ToggleGroup',  className);
  
  return <BaseToggleGroup ref={ref} className={cls} {...props} />;
});

export const ToggleGroupItem = React.forwardRef(function ToggleGroupItem(
  { className = '', ...props },
  ref
) {
  const cls = cx('ui-Toggle', className);
  return <BaseToggleGroup.Item ref={ref} className={cls} {...props} />;
});
