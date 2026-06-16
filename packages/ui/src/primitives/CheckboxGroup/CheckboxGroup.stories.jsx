import { CheckboxGroup } from './CheckboxGroup.jsx';
import { SlotsList } from '../../storybook/AutoStories.jsx';
import { Checkbox } from '../Checkbox/Checkbox.jsx';

export default { title: 'Primitives/CheckboxGroup' };

export const Slots = {
  render: () => <SlotsList title="CheckboxGroup slots" value={CheckboxGroup} />
};

export const Preview = {
  render: () => (
    <CheckboxGroup defaultValue={['a']}>
      <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
        <Checkbox.Root value="a" aria-label="A">
          <Checkbox.Indicator>✓</Checkbox.Indicator>
        </Checkbox.Root>
        <span>A</span>
      </label>
      <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center', marginLeft: 12 }}>
        <Checkbox.Root value="b" aria-label="B">
          <Checkbox.Indicator>✓</Checkbox.Indicator>
        </Checkbox.Root>
        <span>B</span>
      </label>
    </CheckboxGroup>
  )
};
