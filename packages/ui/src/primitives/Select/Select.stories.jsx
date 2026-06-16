import { Select } from './Select.jsx';
import { SlotsList } from '../../storybook/AutoStories.jsx';

export default { title: 'Primitives/Select' };

export const Slots = {
  render: () => <SlotsList title="Select slots" value={Select} />
};

export const Preview = {
  render: () => (
    <Select.Root defaultOpen defaultValue="one">
      <Select.Trigger>
        <Select.Value placeholder="Select…" />
      </Select.Trigger>
      <Select.Portal>
        <Select.Backdrop />
        <Select.Positioner>
          <Select.Popup>
            <Select.List>
              <Select.Item value="one">
                <Select.ItemText>One</Select.ItemText>
                <Select.ItemIndicator>✓</Select.ItemIndicator>
              </Select.Item>
              <Select.Item value="two">
                <Select.ItemText>Two</Select.ItemText>
                <Select.ItemIndicator>✓</Select.ItemIndicator>
              </Select.Item>
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  )
};
