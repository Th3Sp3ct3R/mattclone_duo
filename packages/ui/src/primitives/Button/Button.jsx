import * as React from 'react';
import { Button as BaseButton } from '@base-ui/react/button';
import { Spinner } from '../Spinner/Spinner.jsx';
import { cx } from '../_utils/cx.js';

export const Button = React.forwardRef(function Button(
  {
    className = '',
    variant = 'primary',
    size = 'md',
    leadingIcon = null,
    trailingIcon = null,
    loading = false,
    loadingLabel = 'Loading',
    block = false,
    children,
    ...props
  },
  ref
) {
  const cls = cx('ui-Button', `ui-Button--${variant}`, `ui-Button--${size}`, className);
  const hasIconOnly = !children && (leadingIcon || trailingIcon);
  const iconOnlyClass = hasIconOnly ? 'ui-Button--iconOnly' : '';
  const loadingClass = loading ? 'ui-Button--loading' : '';
  const blockClass = block ? 'ui-Button--block' : '';
  
  return (
    <BaseButton
      ref={ref}
      className={cx(cls, iconOnlyClass, loadingClass, blockClass)}
      disabled={props.disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <span className="ui-Button__loading">
          <Spinner size="sm" label={loadingLabel} />
          <span className="ui-Button__label">{loadingLabel}</span>
        </span>
      ) : (
        <>
          {leadingIcon ? (
            <span className="ui-Button__icon ui-Button__icon--leading">{leadingIcon}</span>
          ) : null}
          {children ? <span className="ui-Button__label">{children}</span> : null}
          {trailingIcon ? (
            <span className="ui-Button__icon ui-Button__icon--trailing">{trailingIcon}</span>
          ) : null}
        </>
      )}
    </BaseButton>
  );
});
