import { Menubar } from './Menubar.jsx';
import { SlotsList } from '../../storybook/AutoStories.jsx';
import { Menu } from '../Menu/Menu.jsx';
import { Button } from '../Button/Button.jsx';

export default { title: 'Primitives/Menubar' };

export const Slots = {
  render: () => <SlotsList title="Menubar slots" value={Menubar} />
};

export const Preview = {
  render: () => (
    <Menubar>
      <Menu.Root defaultOpen>
        <Menu.Trigger>
          <Button>File</Button>
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner>
            <Menu.Popup>
              <Menu.Item onSelect={() => {}}>New</Menu.Item>
              <Menu.Item onSelect={() => {}}>Open</Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </Menubar>
  )
};
