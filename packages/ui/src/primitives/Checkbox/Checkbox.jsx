import * as React from 'react';
import { Checkbox as BaseCheckbox } from '@base-ui/react/checkbox';
import { cx } from '../_utils/cx.js';

const Indicator = React.forwardRef(function CheckboxIndicator({ className = '', ...props }, ref) {
  return (
    <BaseCheckbox.Indicator
      ref={ref}
      className={cx('ui-CheckboxIndicator', className)}
      {...props}
    />
  );
});

const Root = React.forwardRef(function CheckboxRoot({ className = '', ...props }, ref) {
  return (
    <BaseCheckbox.Root
      ref={ref}
      className={cx('ui-CheckboxRoot', className)}
      {...props}
    />
  );
});

export const Checkbox = {
  ...BaseCheckbox,
  Indicator, Root
};
