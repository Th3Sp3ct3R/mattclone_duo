import { Collapsible } from './Collapsible.jsx';
import { SlotsList } from '../../storybook/AutoStories.jsx';

export default { title: 'Primitives/Collapsible' };

export const Slots = {
  render: () => <SlotsList title="Collapsible slots" value={Collapsible} />
};

export const Preview = {
  render: () => (
    <Collapsible.Root defaultOpen>
      <Collapsible.Trigger>Toggle</Collapsible.Trigger>
      <Collapsible.Panel>Panel content</Collapsible.Panel>
    </Collapsible.Root>
  )
};
