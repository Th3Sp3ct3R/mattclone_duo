import { Toggle } from './Toggle.jsx';
import { SlotsList } from '../../storybook/AutoStories.jsx';

export default { title: 'Primitives/Toggle' };

export const Slots = {
  render: () => <SlotsList title="Toggle slots" value={Toggle} />
};

export const Preview = {
  render: () => (
    <Toggle aria-label="Toggle" defaultPressed>
      Toggle
    </Toggle>
  )
};
