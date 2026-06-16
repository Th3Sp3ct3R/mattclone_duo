import { Combobox } from './Combobox.jsx';
import { SlotsList } from '../../storybook/AutoStories.jsx';

export default { title: 'Primitives/Combobox' };

export const Slots = {
  render: () => <SlotsList title="Combobox slots" value={Combobox} />
};

export const Preview = {
  render: () => (
    <Combobox.Root defaultOpen>
      <Combobox.Input placeholder="Search…" aria-label="Combobox" />
      <Combobox.Portal>
        <Combobox.Positioner>
          <Combobox.Popup>
            <Combobox.List>
              <Combobox.Item value="one">One</Combobox.Item>
              <Combobox.Item value="two">Two</Combobox.Item>
              <Combobox.Item value="three">Three</Combobox.Item>
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  )
};
