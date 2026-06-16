import * as React from 'react';
import { Fieldset as BaseFieldset } from '@base-ui/react/fieldset';
import { cx } from '../_utils/cx.js';

const Legend = React.forwardRef(function FieldsetLegend({ className = '', ...props }, ref) {
  return (
    <BaseFieldset.Legend
      ref={ref}
      className={cx('ui-FieldsetLegend', className)}
      {...props}
    />
  );
});

const Root = React.forwardRef(function FieldsetRoot({ className = '', ...props }, ref) {
  return (
    <BaseFieldset.Root
      ref={ref}
      className={cx('ui-FieldsetRoot', className)}
      {...props}
    />
  );
});

export const Fieldset = {
  ...BaseFieldset,
  Legend, Root
};
