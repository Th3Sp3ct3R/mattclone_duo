'use client';

import { useEffect, useRef, useState } from 'react';

import { cx } from '../../primitives/_utils/cx.js';

export function LocaleSelect({
  value,
  options = [],
  onChange,
  className = '',
  ariaLabel = 'Language',
  ...props
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const currentOption = options.find((option) => option.value === value) || options[0];

  useEffect(() => {
    if (!open) return undefined;

    const handlePointer = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleKey = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('mousedown', handlePointer);
    window.addEventListener('keydown', handleKey);

    return () => {
      window.removeEventListener('mousedown', handlePointer);
      window.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const handleSelect = (nextValue) => {
    setOpen(false);
    if (nextValue !== value) {
      onChange?.(nextValue);
    }
  };

  return (
    <div className={cx('c-LocaleSelect', className)} data-locale={value} ref={rootRef} {...props}>
      <button
        type="button"
        className="c-LocaleSelect__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span
          className={cx(
            'c-LocaleSelect__flag',
            currentOption?.flag && `c-LocaleSelect__flag--${currentOption.flag}`
          )}
          aria-hidden="true"
        />
        <span className="c-LocaleSelect__sr">{currentOption?.label || value}</span>
      </button>
      {open ? (
        <div className="c-LocaleSelect__menu" role="listbox" aria-label={ariaLabel}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={cx(
                'c-LocaleSelect__option',
                option.value === value && 'is-selected'
              )}
              role="option"
              aria-selected={option.value === value}
              onClick={() => handleSelect(option.value)}
            >
              <span
                className={cx(
                  'c-LocaleSelect__flag',
                  option.flag && `c-LocaleSelect__flag--${option.flag}`
                )}
                aria-hidden="true"
              />
              <span className="c-LocaleSelect__sr">{option.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
