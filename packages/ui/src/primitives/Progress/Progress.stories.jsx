import { Progress } from './Progress.jsx';
import { SlotsList } from '../../storybook/AutoStories.jsx';

export default { title: 'Primitives/Progress' };

export const Slots = {
  render: () => <SlotsList title="Progress slots" value={Progress} />
};

export const Preview = {
  render: () => (
    <Progress.Root value={60} max={100}>
      <Progress.Label>Progress</Progress.Label>
      <Progress.Track>
        <Progress.Indicator />
      </Progress.Track>
      <Progress.Value />
    </Progress.Root>
  )
};
