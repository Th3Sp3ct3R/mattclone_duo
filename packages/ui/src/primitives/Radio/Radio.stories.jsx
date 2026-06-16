import { Radio } from './Radio.jsx';
import { SlotsList } from '../../storybook/AutoStories.jsx';

export default { title: 'Primitives/Radio' };

export const Slots = {
  render: () => <SlotsList title="Radio slots" value={Radio} />
};

export const Preview = {
  render: () => (
    <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
      <Radio.Root defaultChecked aria-label="Radio">
        <Radio.Indicator>●</Radio.Indicator>
      </Radio.Root>
      <span>Radio</span>
    </label>
  )
};
