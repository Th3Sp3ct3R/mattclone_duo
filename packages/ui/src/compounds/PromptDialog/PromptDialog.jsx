'use client';

import { useEffect, useState } from 'react';
import { Dialog } from '../../primitives/Dialog/Dialog.jsx';
import { Button } from '../../primitives/Button/Button.jsx';
import { Input } from '../../primitives/Input/Input.jsx';
import { cx } from '../../primitives/_utils/cx.js';

export function PromptDialog({
  open,
  onOpenChange,
  title,
  description,
  label,
  placeholder,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'primary',
  defaultValue = '',
  className = '',
  onConfirm
}) {
  const [value, setValue] = useState(defaultValue);
  const actionsClassName = cx('c-PromptDialog__actions', className);

  useEffect(() => {
    if (open) setValue(defaultValue || '');
  }, [open, defaultValue]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="c-DialogBackdrop" />
        <Dialog.Popup className="c-DialogPanel">
          {title ? <Dialog.Title>{title}</Dialog.Title> : null}
          {description ? <Dialog.Description>{description}</Dialog.Description> : null}
          <div className="c-PromptDialog__field">
            {label ? <label className="c-PromptDialog__label">{label}</label> : null}
            <Input
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={placeholder}
            />
          </div>
          <div className={actionsClassName}>
            <Dialog.Close>
              <Button variant="secondary">{cancelLabel}</Button>
            </Dialog.Close>
            <Button
              variant={confirmVariant}
              onClick={() => {
                if (typeof onConfirm === 'function') onConfirm(value);
                if (typeof onOpenChange === 'function') onOpenChange(false);
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
