import { RadioGroup } from './RadioGroup.jsx';
import { SlotsList } from '../../storybook/AutoStories.jsx';
import { Radio } from '../Radio/Radio.jsx';

export default { title: 'Primitives/RadioGroup' };

export const Slots = {
  render: () => <SlotsList title="RadioGroup slots" value={RadioGroup} />
};

export const Preview = {
  render: () => (
    <RadioGroup defaultValue="a" aria-label="RadioGroup">
      <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
        <Radio.Root value="a" aria-label="A">
          <Radio.Indicator>●</Radio.Indicator>
        </Radio.Root>
        <span>A</span>
      </label>
      <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center', marginLeft: 12 }}>
        <Radio.Root value="b" aria-label="B">
          <Radio.Indicator>●</Radio.Indicator>
        </Radio.Root>
        <span>B</span>
      </label>
    </RadioGroup>
  )
};
