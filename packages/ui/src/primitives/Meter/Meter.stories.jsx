import { Meter } from './Meter.jsx';
import { SlotsList } from '../../storybook/AutoStories.jsx';

export default { title: 'Primitives/Meter' };

export const Slots = {
  render: () => <SlotsList title="Meter slots" value={Meter} />
};

export const Preview = {
  render: () => (
    <Meter.Root value={70} min={0} max={100}>
      <Meter.Label>Meter</Meter.Label>
      <Meter.Track>
        <Meter.Indicator />
      </Meter.Track>
      <Meter.Value />
    </Meter.Root>
  )
};
