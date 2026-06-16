import { Avatar } from './Avatar.jsx';
import { SlotsList } from '../../storybook/AutoStories.jsx';

export default { title: 'Primitives/Avatar' };

export const Slots = {
  render: () => <SlotsList title="Avatar slots" value={Avatar} />
};

export const Preview = {
  render: () => (
    <Avatar.Root>
      <Avatar.Image src="https://base-ui.com/favicon.ico" alt="Avatar" />
      <Avatar.Fallback>BU</Avatar.Fallback>
    </Avatar.Root>
  )
};
