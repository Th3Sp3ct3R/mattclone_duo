import { Checkbox } from './Checkbox.jsx';

export default {
  title: 'Primitives/Checkbox',
  args: {
    defaultChecked: false,
    disabled: false
  },
  argTypes: {
    defaultChecked: { control: 'boolean' },
    disabled: { control: 'boolean' }
  }
};

export const Default = {
  render: (args) => (
    <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
      <Checkbox.Root aria-label="Checkbox" {...args} />
      <span>Label</span>
    </label>
  )
};

export const WithIndicator = {
  render: (args) => (
    <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
      <Checkbox.Root aria-label="Checkbox" {...args}>
        <Checkbox.Indicator>✓</Checkbox.Indicator>
      </Checkbox.Root>
      <span>Label</span>
    </label>
  )
};


