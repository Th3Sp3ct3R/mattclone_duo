import * as React from 'react';
import { Switch as BaseSwitch } from '@base-ui/react/switch';
import { cx } from '../_utils/cx.js';

const Root = React.forwardRef(function SwitchRoot({ className = '', ...props }, ref) {
  return (
    <BaseSwitch.Root
      ref={ref}
      className={cx('ui-SwitchRoot', className)}
      {...props}
    />
  );
});

const Thumb = React.forwardRef(function SwitchThumb({ className = '', ...props }, ref) {
  return (
    <BaseSwitch.Thumb
      ref={ref}
      className={cx('ui-SwitchThumb', className)}
      {...props}
    />
  );
});

export const Switch = {
  ...BaseSwitch,
  Root, Thumb
};
