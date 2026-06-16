import { Menu } from './Menu.jsx';
import { SlotsList } from '../../storybook/AutoStories.jsx';
import { Button } from '../Button/Button.jsx';

export default { title: 'Primitives/Menu' };

export const Slots = {
  render: () => <SlotsList title="Menu slots" value={Menu} />
};

export const Preview = {
  render: () => (
    <Menu.Root defaultOpen>
      <Menu.Trigger>
        <Button>Open menu</Button>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Backdrop />
        <Menu.Positioner>
          <Menu.Popup>
            <Menu.Item onSelect={() => {}}>Item</Menu.Item>
            <Menu.Separator />
            <Menu.Item onSelect={() => {}}>Item 2</Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
};
