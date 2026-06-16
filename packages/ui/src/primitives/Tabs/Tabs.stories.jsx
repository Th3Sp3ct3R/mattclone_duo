import { Tabs } from './Tabs.jsx';
import { SlotsList } from '../../storybook/AutoStories.jsx';

export default { title: 'Primitives/Tabs' };

export const Slots = {
  render: () => <SlotsList title="Tabs slots" value={Tabs} />
};

export const Preview = {
  render: () => (
    <Tabs.Root defaultValue="one">
      <Tabs.List>
        <Tabs.Tab value="one">One</Tabs.Tab>
        <Tabs.Tab value="two">Two</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="one">Panel one</Tabs.Panel>
      <Tabs.Panel value="two">Panel two</Tabs.Panel>
    </Tabs.Root>
  )
};
