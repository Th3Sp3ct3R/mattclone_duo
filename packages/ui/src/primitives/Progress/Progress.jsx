import * as React from 'react';
import { Progress as BaseProgress } from '@base-ui/react/progress';
import { cx } from '../_utils/cx.js';

const Indicator = React.forwardRef(function ProgressIndicator({ className = '', ...props }, ref) {
  return (
    <BaseProgress.Indicator
      ref={ref}
      className={cx('ui-ProgressIndicator', className)}
      {...props}
    />
  );
});

const Label = React.forwardRef(function ProgressLabel({ className = '', ...props }, ref) {
  return (
    <BaseProgress.Label
      ref={ref}
      className={cx('ui-ProgressLabel', className)}
      {...props}
    />
  );
});

const Root = React.forwardRef(function ProgressRoot({ className = '', ...props }, ref) {
  return (
    <BaseProgress.Root
      ref={ref}
      className={cx('ui-ProgressRoot', className)}
      {...props}
    />
  );
});

const Track = React.forwardRef(function ProgressTrack({ className = '', ...props }, ref) {
  return (
    <BaseProgress.Track
      ref={ref}
      className={cx('ui-ProgressTrack', className)}
      {...props}
    />
  );
});

const Value = React.forwardRef(function ProgressValue({ className = '', ...props }, ref) {
  return (
    <BaseProgress.Value
      ref={ref}
      className={cx('ui-ProgressValue', className)}
      {...props}
    />
  );
});

export const Progress = {
  ...BaseProgress,
  Indicator, Label, Root, Track, Value
};
