import * as React from 'react';
import { CheckboxGroup as BaseCheckboxGroup } from '@base-ui/react/checkbox-group';
import { cx } from '../_utils/cx.js';

export const CheckboxGroup = React.forwardRef(function CheckboxGroup(
  { className = '',  ...props },
  ref
) {
  const cls = cx('ui-CheckboxGroup',  className);
  
  return <BaseCheckboxGroup ref={ref} className={cls} {...props} />;
});
