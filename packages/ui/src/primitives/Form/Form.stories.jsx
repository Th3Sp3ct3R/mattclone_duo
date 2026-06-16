import { Form } from './Form.jsx';
import { SlotsList } from '../../storybook/AutoStories.jsx';
import { Button } from '../Button/Button.jsx';

export default { title: 'Primitives/Form' };

export const Slots = {
  render: () => <SlotsList title="Form slots" value={Form} />
};

export const Preview = {
  render: () => (
    <Form
      onSubmit={(e) => {
        e.preventDefault();
      }}
    >
      <Button type="submit">Submit</Button>
    </Form>
  )
};
