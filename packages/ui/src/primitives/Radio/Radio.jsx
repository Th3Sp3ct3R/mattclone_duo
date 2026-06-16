import * as React from 'react';
import { Radio as BaseRadio } from '@base-ui/react/radio';
import { cx } from '../_utils/cx.js';

const Indicator = React.forwardRef(function RadioIndicator({ className = '', ...props }, ref) {
  return (
    <BaseRadio.Indicator
      ref={ref}
      className={cx('ui-RadioIndicator', className)}
      {...props}
    />
  );
});

const Root = React.forwardRef(function RadioRoot({ className = '', ...props }, ref) {
  return (
    <BaseRadio.Root
      ref={ref}
      className={cx('ui-RadioRoot', className)}
      {...props}
    />
  );
});

export const Radio = {
  ...BaseRadio,
  Indicator, Root
};
