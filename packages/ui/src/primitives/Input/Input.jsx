import * as React from 'react';
import { Input as BaseInput } from '@base-ui/react/input';
import { cx } from '../_utils/cx.js';

export const Input = React.forwardRef(function Input(
  { className = '', size = 'md', invalid = false, ...props },
  ref
) {
  const cls = cx('ui-Input', `ui-Input--${size}`, invalid ? 'ui-Input--invalid' : '', className);
  if (invalid) props['aria-invalid'] = true;
  return <BaseInput ref={ref} className={cls} {...props} />;
});
