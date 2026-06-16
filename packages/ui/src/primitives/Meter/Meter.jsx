import * as React from 'react';
import { Meter as BaseMeter } from '@base-ui/react/meter';
import { cx } from '../_utils/cx.js';

const Indicator = React.forwardRef(function MeterIndicator({ className = '', ...props }, ref) {
  return (
    <BaseMeter.Indicator
      ref={ref}
      className={cx('ui-MeterIndicator', className)}
      {...props}
    />
  );
});

const Label = React.forwardRef(function MeterLabel({ className = '', ...props }, ref) {
  return (
    <BaseMeter.Label
      ref={ref}
      className={cx('ui-MeterLabel', className)}
      {...props}
    />
  );
});

const Root = React.forwardRef(function MeterRoot({ className = '', ...props }, ref) {
  return (
    <BaseMeter.Root
      ref={ref}
      className={cx('ui-MeterRoot', className)}
      {...props}
    />
  );
});

const Track = React.forwardRef(function MeterTrack({ className = '', ...props }, ref) {
  return (
    <BaseMeter.Track
      ref={ref}
      className={cx('ui-MeterTrack', className)}
      {...props}
    />
  );
});

const Value = React.forwardRef(function MeterValue({ className = '', ...props }, ref) {
  return (
    <BaseMeter.Value
      ref={ref}
      className={cx('ui-MeterValue', className)}
      {...props}
    />
  );
});

export const Meter = {
  ...BaseMeter,
  Indicator, Label, Root, Track, Value
};
