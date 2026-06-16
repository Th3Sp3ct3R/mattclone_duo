import { Fieldset } from './Fieldset.jsx';
import { SlotsList } from '../../storybook/AutoStories.jsx';

export default { title: 'Primitives/Fieldset' };

export const Slots = {
  render: () => <SlotsList title="Fieldset slots" value={Fieldset} />
};

export const Preview = {
  render: () => (
    <Fieldset.Root>
      <Fieldset.Legend>Legend</Fieldset.Legend>
      <div>Fieldset content</div>
    </Fieldset.Root>
  )
};
