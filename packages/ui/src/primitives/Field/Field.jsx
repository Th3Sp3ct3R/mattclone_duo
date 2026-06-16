import * as React from 'react';
import { Field as BaseField } from '@base-ui/react/field';
import { cx } from '../_utils/cx.js';

const Control = React.forwardRef(function FieldControl({ className = '', children, ...props }, ref) {
  if (children) {
    return (
      <div ref={ref} className={cx('ui-FieldControl', className)} {...props}>
        {children}
      </div>
    );
  }

  return <BaseField.Control ref={ref} className={cx('ui-FieldControl', className)} {...props} />;
});

const Description = React.forwardRef(function FieldDescription({ className = '', ...props }, ref) {
  return (
    <BaseField.Description
      ref={ref}
      className={cx('ui-FieldDescription', className)}
      {...props}
    />
  );
});

const Error = React.forwardRef(function FieldError({ className = '', ...props }, ref) {
  return (
    <BaseField.Error
      ref={ref}
      className={cx('ui-FieldError', className)}
      {...props}
    />
  );
});

const Item = React.forwardRef(function FieldItem({ className = '', ...props }, ref) {
  return (
    <BaseField.Item
      ref={ref}
      className={cx('ui-FieldItem', className)}
      {...props}
    />
  );
});

const Label = React.forwardRef(function FieldLabel({ className = '', ...props }, ref) {
  return (
    <BaseField.Label
      ref={ref}
      className={cx('ui-FieldLabel', className)}
      {...props}
    />
  );
});

const Root = React.forwardRef(function FieldRoot({ className = '', ...props }, ref) {
  return (
    <BaseField.Root
      ref={ref}
      className={cx('ui-FieldRoot', className)}
      {...props}
    />
  );
});

const Validity = React.forwardRef(function FieldValidity({ className = '', ...props }, ref) {
  return (
    <BaseField.Validity
      ref={ref}
      className={cx('ui-FieldValidity', className)}
      {...props}
    />
  );
});

export const Field = {
  ...BaseField,
  Control, Description, Error, Item, Label, Root, Validity
};
