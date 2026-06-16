import { Toast } from './Toast.jsx';
import { SlotsList } from '../../storybook/AutoStories.jsx';

export default { title: 'Primitives/Toast' };

export const Slots = {
  render: () => <SlotsList title="Toast slots" value={Toast} />
};

export const Preview = {
  render: () => (
    <Toast.Provider>
      <Toast.Viewport />
      <Toast.Root open>
        <Toast.Title>Toast</Toast.Title>
        <Toast.Description>Message</Toast.Description>
        <Toast.Close>Close</Toast.Close>
      </Toast.Root>
    </Toast.Provider>
  )
};
