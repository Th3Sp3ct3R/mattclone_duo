import { Popover } from './Popover.jsx';
import { SlotsList } from '../../storybook/AutoStories.jsx';
import { Button } from '../Button/Button.jsx';

export default { title: 'Primitives/Popover' };

export const Slots = {
  render: () => <SlotsList title="Popover slots" value={Popover} />
};

export const Preview = {
  render: () => (
    <Popover.Root defaultOpen>
      <Popover.Trigger>
        <Button>Open</Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Backdrop />
        <Popover.Positioner>
          <Popover.Popup>
            <Popover.Title>Popover</Popover.Title>
            <Popover.Description>Description</Popover.Description>
            <Popover.Close>
              <Button variant="secondary">Close</Button>
            </Popover.Close>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
};
