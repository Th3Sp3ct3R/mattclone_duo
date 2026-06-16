import { Input } from './Input.jsx';

export default {
  title: 'Primitives/Input',
  component: Input,
  args: {
    placeholder: 'Type here…',
    size: 'md',
    invalid: false
  },
  argTypes: {
    size: { control: 'radio', options: ['sm', 'md', 'lg'] },
    invalid: { control: 'boolean' }
  }
};

export const Default = {};

export const Invalid = {
  args: { invalid: true }
};


