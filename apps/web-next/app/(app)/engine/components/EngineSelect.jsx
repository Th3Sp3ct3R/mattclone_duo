'use client';

import { Select } from '@julio/ui';

export function EngineSelect({ value, onValueChange, placeholder = 'Select...', options = [], disabled = false }) {
  return (
    <Select.Root value={value || ''} onValueChange={onValueChange} disabled={disabled}>
      <Select.Trigger>
        <Select.Value placeholder={placeholder} />
      </Select.Trigger>
      <Select.Portal>
        <Select.Backdrop />
        <Select.Positioner>
          <Select.Popup>
            <Select.List>
              {options.map((option) => (
                <Select.Item key={option.value} value={option.value} disabled={option.disabled}>
                  <Select.ItemText>{option.label}</Select.ItemText>
                  <Select.ItemIndicator>✓</Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
