import * as React from 'react';
import { RadioGroup as BaseRadioGroup } from '@base-ui/react/radio-group';
import { cx } from '../_utils/cx.js';

export const RadioGroup = React.forwardRef(function RadioGroup(
  { className = '',  ...props },
  ref
) {
  const cls = cx('ui-RadioGroup',  className);
  
  return <BaseRadioGroup ref={ref} className={cls} {...props} />;
});
