import { Separator } from './Separator.jsx';
import { SlotsList } from '../../storybook/AutoStories.jsx';

export default { title: 'Primitives/Separator' };

export const Slots = {
  render: () => <SlotsList title="Separator slots" value={Separator} />
};

export const Preview = {
  render: () => (
    <div style={{ display: 'grid', gap: 8 }}>
      <div>Before</div>
      <Separator />
      <div>After</div>
    </div>
  )
};
