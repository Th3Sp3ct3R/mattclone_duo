import * as React from 'react';
import { Slider as BaseSlider } from '@base-ui/react/slider';
import { cx } from '../_utils/cx.js';

const Control = React.forwardRef(function SliderControl({ className = '', ...props }, ref) {
  return (
    <BaseSlider.Control
      ref={ref}
      className={cx('ui-SliderControl', className)}
      {...props}
    />
  );
});

const Indicator = React.forwardRef(function SliderIndicator({ className = '', ...props }, ref) {
  return (
    <BaseSlider.Indicator
      ref={ref}
      className={cx('ui-SliderIndicator', className)}
      {...props}
    />
  );
});

const Root = React.forwardRef(function SliderRoot({ className = '', ...props }, ref) {
  return (
    <BaseSlider.Root
      ref={ref}
      className={cx('ui-SliderRoot', className)}
      {...props}
    />
  );
});

const Thumb = React.forwardRef(function SliderThumb({ className = '', ...props }, ref) {
  return (
    <BaseSlider.Thumb
      ref={ref}
      className={cx('ui-SliderThumb', className)}
      {...props}
    />
  );
});

const Track = React.forwardRef(function SliderTrack({ className = '', ...props }, ref) {
  return (
    <BaseSlider.Track
      ref={ref}
      className={cx('ui-SliderTrack', className)}
      {...props}
    />
  );
});

const Value = React.forwardRef(function SliderValue({ className = '', ...props }, ref) {
  return (
    <BaseSlider.Value
      ref={ref}
      className={cx('ui-SliderValue', className)}
      {...props}
    />
  );
});

export const Slider = {
  ...BaseSlider,
  Control, Indicator, Root, Thumb, Track, Value
};
