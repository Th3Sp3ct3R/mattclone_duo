import { Slider } from './Slider.jsx';
import { SlotsList } from '../../storybook/AutoStories.jsx';

export default { title: 'Primitives/Slider' };

export const Slots = {
  render: () => <SlotsList title="Slider slots" value={Slider} />
};

export const Preview = {
  render: () => (
    <Slider.Root defaultValue={50} min={0} max={100} aria-label="Slider">
      <Slider.Control>
        <Slider.Track>
          <Slider.Indicator />
        </Slider.Track>
        <Slider.Thumb />
      </Slider.Control>
    </Slider.Root>
  )
};
