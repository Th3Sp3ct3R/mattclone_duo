import { Autocomplete } from './Autocomplete.jsx';
import { SlotsList } from '../../storybook/AutoStories.jsx';

export default { title: 'Primitives/Autocomplete' };

export const Slots = {
  render: () => <SlotsList title="Autocomplete slots" value={Autocomplete} />
};

export const Preview = {
  render: () => (
    <Autocomplete.Root defaultOpen>
      <Autocomplete.Input placeholder="Search…" aria-label="Search" />
      <Autocomplete.Portal>
        <Autocomplete.Positioner>
          <Autocomplete.Popup>
            <Autocomplete.List>
              <Autocomplete.Item value="one">One</Autocomplete.Item>
              <Autocomplete.Item value="two">Two</Autocomplete.Item>
              <Autocomplete.Item value="three">Three</Autocomplete.Item>
            </Autocomplete.List>
          </Autocomplete.Popup>
        </Autocomplete.Positioner>
      </Autocomplete.Portal>
    </Autocomplete.Root>
  )
};
