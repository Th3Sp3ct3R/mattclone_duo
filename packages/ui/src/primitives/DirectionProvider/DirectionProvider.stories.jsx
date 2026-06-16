import { DirectionProvider } from './DirectionProvider.jsx';
import { SlotsList } from '../../storybook/AutoStories.jsx';

export default { title: 'Primitives/DirectionProvider' };

export const Slots = {
  render: () => <SlotsList title="DirectionProvider slots" value={DirectionProvider} />
};

export const Preview = {
  render: () => (
    <DirectionProvider direction="rtl">
      <div dir="rtl">RTL direction provider</div>
    </DirectionProvider>
  )
};
