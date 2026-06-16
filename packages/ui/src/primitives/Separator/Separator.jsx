import * as React from 'react';
import { Separator as BaseSeparator } from '@base-ui/react/separator';
import { cx } from '../_utils/cx.js';

export const Separator = React.forwardRef(function Separator(
  { className = '',  ...props },
  ref
) {
  const cls = cx('ui-Separator',  className);
  
  return <BaseSeparator ref={ref} className={cls} {...props} />;
});
