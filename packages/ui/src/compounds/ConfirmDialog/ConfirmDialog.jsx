'use client';

import { useMemo } from 'react';
import { AlertDialog } from '../../primitives/AlertDialog/AlertDialog.jsx';
import { Button } from '../../primitives/Button/Button.jsx';
import { cx } from '../../primitives/_utils/cx.js';

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'danger',
  className = '',
  onConfirm
}) {
  const actionsClassName = useMemo(
    () => cx('c-ConfirmDialog__actions', className),
    [className]
  );

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="c-DialogBackdrop" />
        <AlertDialog.Popup className="c-DialogPanel">
          {title ? <AlertDialog.Title>{title}</AlertDialog.Title> : null}
          {description ? <AlertDialog.Description>{description}</AlertDialog.Description> : null}
          <div className={actionsClassName}>
            <AlertDialog.Close>
              <Button variant="secondary">{cancelLabel}</Button>
            </AlertDialog.Close>
            <Button
              variant={confirmVariant}
              onClick={() => {
                if (typeof onConfirm === 'function') onConfirm();
                if (typeof onOpenChange === 'function') onOpenChange(false);
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
