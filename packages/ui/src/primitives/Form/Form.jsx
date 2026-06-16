import * as React from 'react';
import { Form as BaseForm } from '@base-ui/react/form';
import { cx } from '../_utils/cx.js';

export const Form = React.forwardRef(function Form(
  { className = '',  ...props },
  ref
) {
  const cls = cx('ui-Form',  className);
  
  return <BaseForm ref={ref} className={cls} {...props} />;
});
