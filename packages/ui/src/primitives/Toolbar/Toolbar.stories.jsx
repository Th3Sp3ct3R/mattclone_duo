import { Toolbar } from './Toolbar.jsx';
import { SlotsList } from '../../storybook/AutoStories.jsx';

export default { title: 'Primitives/Toolbar' };

export const Slots = {
  render: () => <SlotsList title="Toolbar slots" value={Toolbar} />
};

export const Preview = {
  render: () => (
    <Toolbar.Root>
      <Toolbar.Group>
        <Toolbar.Button>Button</Toolbar.Button>
        <Toolbar.Separator />
        <Toolbar.Link href="#">Link</Toolbar.Link>
      </Toolbar.Group>
    </Toolbar.Root>
  )
};
