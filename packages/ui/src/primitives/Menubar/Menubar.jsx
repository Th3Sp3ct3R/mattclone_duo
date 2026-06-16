import * as React from 'react';
import { Menubar as BaseMenubar } from '@base-ui/react/menubar';
import { cx } from '../_utils/cx.js';

export const Menubar = React.forwardRef(function Menubar(
  { className = '',  ...props },
  ref
) {
  const cls = cx('ui-Menubar',  className);
  
  return <BaseMenubar ref={ref} className={cls} {...props} />;
});
