import { NumberField } from './NumberField.jsx';
import { SlotsList } from '../../storybook/AutoStories.jsx';

export default { title: 'Primitives/NumberField' };

export const Slots = {
  render: () => <SlotsList title="NumberField slots" value={NumberField} />
};

export const Preview = {
  render: () => (
    <NumberField.Root defaultValue={5} min={0} max={10} aria-label="NumberField">
      <NumberField.Group>
        <NumberField.Decrement>-</NumberField.Decrement>
        <NumberField.Input />
        <NumberField.Increment>+</NumberField.Increment>
      </NumberField.Group>
    </NumberField.Root>
  )
};
