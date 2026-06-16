import * as React from 'react';
import { cx } from '../_utils/cx.js';

export const Spinner = React.forwardRef(function Spinner(
  { className = '', size = 'md', label = 'Loading', ...props },
  ref
) {
  return (
    <span
      ref={ref}
      className={cx('ui-Spinner', `ui-Spinner--${size}`, className)}
      role="status"
      aria-live="polite"
      aria-label={label}
      {...props}
    />
  );
});


