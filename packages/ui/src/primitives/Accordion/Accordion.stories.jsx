import { Accordion } from './Accordion.jsx';
import { SlotsList } from '../../storybook/AutoStories.jsx';

export default { title: 'Primitives/Accordion' };

export const Slots = {
  render: () => <SlotsList title="Accordion slots" value={Accordion} />
};

export const Preview = {
  render: () => (
    <Accordion.Root defaultValue="one">
      <Accordion.Item value="one">
        <Accordion.Header>
          <Accordion.Trigger>Section</Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Panel>Panel content</Accordion.Panel>
      </Accordion.Item>
    </Accordion.Root>
  )
};
