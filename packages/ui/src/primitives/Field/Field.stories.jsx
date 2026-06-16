import { Field } from './Field.jsx';
import { SlotsList } from '../../storybook/AutoStories.jsx';
import { Input } from '../Input/Input.jsx';

export default { title: 'Primitives/Field' };

export const Slots = {
  render: () => <SlotsList title="Field slots" value={Field} />
};

export const Preview = {
  render: () => (
    <Field.Root>
      <Field.Label>Email</Field.Label>
      <Field.Control>
        <Input placeholder="you@example.com" />
      </Field.Control>
      <Field.Description>Helper text</Field.Description>
    </Field.Root>
  )
};
