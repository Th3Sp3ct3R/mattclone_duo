import { Tooltip } from './Tooltip.jsx';
import { SlotsList } from '../../storybook/AutoStories.jsx';
import { Button } from '../Button/Button.jsx';

export default { title: 'Primitives/Tooltip' };

export const Slots = {
  render: () => <SlotsList title="Tooltip slots" value={Tooltip} />
};

export const Preview = {
  render: () => (
    <Tooltip.Provider>
      <Tooltip.Root defaultOpen>
        <Tooltip.Trigger>
          <Button>Hover me</Button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Positioner>
            <Tooltip.Popup>
              Tooltip content
              <Tooltip.Arrow />
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
      <Tooltip.Viewport />
    </Tooltip.Provider>
  )
};
