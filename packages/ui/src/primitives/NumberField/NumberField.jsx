import * as React from 'react';
import { NumberField as BaseNumberField } from '@base-ui/react/number-field';
import { cx } from '../_utils/cx.js';

const Decrement = React.forwardRef(function NumberFieldDecrement({ className = '', ...props }, ref) {
  return (
    <BaseNumberField.Decrement
      ref={ref}
      className={cx('ui-NumberFieldDecrement', className)}
      {...props}
    />
  );
});

const Group = React.forwardRef(function NumberFieldGroup({ className = '', ...props }, ref) {
  return (
    <BaseNumberField.Group
      ref={ref}
      className={cx('ui-NumberFieldGroup', className)}
      {...props}
    />
  );
});

const Increment = React.forwardRef(function NumberFieldIncrement({ className = '', ...props }, ref) {
  return (
    <BaseNumberField.Increment
      ref={ref}
      className={cx('ui-NumberFieldIncrement', className)}
      {...props}
    />
  );
});

const Input = React.forwardRef(function NumberFieldInput({ className = '', ...props }, ref) {
  return (
    <BaseNumberField.Input
      ref={ref}
      className={cx('ui-NumberFieldInput', className)}
      {...props}
    />
  );
});

const Root = React.forwardRef(function NumberFieldRoot({ className = '', ...props }, ref) {
  return (
    <BaseNumberField.Root
      ref={ref}
      className={cx('ui-NumberFieldRoot', className)}
      {...props}
    />
  );
});

const ScrubArea = React.forwardRef(function NumberFieldScrubArea({ className = '', ...props }, ref) {
  return (
    <BaseNumberField.ScrubArea
      ref={ref}
      className={cx('ui-NumberFieldScrubArea', className)}
      {...props}
    />
  );
});

const ScrubAreaCursor = React.forwardRef(function NumberFieldScrubAreaCursor({ className = '', ...props }, ref) {
  return (
    <BaseNumberField.ScrubAreaCursor
      ref={ref}
      className={cx('ui-NumberFieldScrubAreaCursor', className)}
      {...props}
    />
  );
});

export const NumberField = {
  ...BaseNumberField,
  Decrement, Group, Increment, Input, Root, ScrubArea, ScrubAreaCursor
};
