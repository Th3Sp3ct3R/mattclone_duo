import { ToggleGroup, ToggleGroupItem } from './ToggleGroup.jsx';
import { SlotsList } from '../../storybook/AutoStories.jsx';

export default { title: 'Primitives/ToggleGroup' };

export const Slots = {
  render: () => <SlotsList title="ToggleGroup slots" value={ToggleGroup} />
};

export const Preview = {
  render: () => (
    <ToggleGroup type="single" defaultValue="one" aria-label="ToggleGroup">
      <ToggleGroupItem value="one">One</ToggleGroupItem>
      <ToggleGroupItem value="two">Two</ToggleGroupItem>
      <ToggleGroupItem value="three">Three</ToggleGroupItem>
    </ToggleGroup>
  )
};
