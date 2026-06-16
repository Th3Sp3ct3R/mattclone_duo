import * as React from 'react';
import { Toggle as BaseToggle } from '@base-ui/react/toggle';
import { cx } from '../_utils/cx.js';

export const Toggle = React.forwardRef(function Toggle(
  { className = '',  ...props },
  ref
) {
  const cls = cx('ui-Toggle',  className);
  
  return <BaseToggle ref={ref} className={cls} {...props} />;
});
