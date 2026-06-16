import { ContextMenu } from './ContextMenu.jsx';
import { SlotsList } from '../../storybook/AutoStories.jsx';
import { Button } from '../Button/Button.jsx';

export default { title: 'Primitives/ContextMenu' };

export const Slots = {
  render: () => <SlotsList title="ContextMenu slots" value={ContextMenu} />
};

export const Preview = {
  render: () => (
    <ContextMenu.Root>
      <ContextMenu.Trigger>
        <Button>Right click</Button>
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Positioner>
          <ContextMenu.Popup>
            <ContextMenu.Item onSelect={() => {}}>Item</ContextMenu.Item>
          </ContextMenu.Popup>
        </ContextMenu.Positioner>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  )
};
