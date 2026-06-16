import * as React from 'react';
import { cx } from '../_utils/cx.js';

export const Card = React.forwardRef(function Card(
  { className = '', as: As = 'div', ...props },
  ref
) {
  return <As ref={ref} className={cx('ui-Card', className)} {...props} />;
});
