import { Button } from './Button.jsx';

export default {
  title: 'Primitives/Button',
  component: Button,
  args: {
    children: 'Button',
    variant: 'primary',
    size: 'md'
  },
  argTypes: {
    variant: {
      control: 'radio',
      options: ['primary', 'secondary', 'outline', 'ghost', 'subtle', 'danger', 'link', 'icon']
    },
    size: { control: 'radio', options: ['sm', 'md', 'lg'] }
  }
};

export const Primary = {};

export const Secondary = {
  args: { variant: 'secondary' }
};

export const Sizes = {
  render: (args) => (
    <div className="layout-inline-gap-12 layout-inline-wrap">
      <Button {...args} size="sm">
        Small
      </Button>
      <Button {...args} size="md">
        Medium
      </Button>
      <Button {...args} size="lg">
        Large
      </Button>
    </div>
  )
};

export const Variants = {
  render: (args) => (
    <div className="layout-stack-gap-12">
      <div className="layout-inline-gap-12 layout-inline-wrap">
        <Button {...args} variant="primary">
          Primary
        </Button>
        <Button {...args} variant="secondary">
          Secondary
        </Button>
        <Button {...args} variant="outline">
          Outline
        </Button>
        <Button {...args} variant="ghost">
          Ghost
        </Button>
        <Button {...args} variant="subtle">
          Subtle
        </Button>
        <Button {...args} variant="danger">
          Danger
        </Button>
        <Button {...args} variant="link">
          Link
        </Button>
        <Button {...args} variant="icon" leadingIcon="★" />
      </div>
      <div className="layout-inline-gap-12 layout-inline-wrap">
        <Button {...args} disabled>
          Disabled primary
        </Button>
        <Button {...args} variant="secondary" disabled>
          Disabled secondary
        </Button>
        <Button {...args} variant="outline" disabled>
          Disabled outline
        </Button>
        <Button {...args} variant="ghost" disabled>
          Disabled ghost
        </Button>
        <Button {...args} variant="subtle" disabled>
          Disabled subtle
        </Button>
        <Button {...args} variant="danger" disabled>
          Disabled danger
        </Button>
        <Button {...args} variant="link" disabled>
          Disabled link
        </Button>
        <Button {...args} variant="icon" disabled leadingIcon="★" />
      </div>
    </div>
  )
};

export const Loading = {
  render: (args) => (
    <div className="layout-inline-gap-12 layout-inline-wrap">
      <Button {...args} loading loadingLabel="Saving">
        Save
      </Button>
      <Button {...args} variant="secondary" loading loadingLabel="Loading">
        Secondary
      </Button>
      <Button {...args} variant="danger" loading loadingLabel="Deleting">
        Delete
      </Button>
      <Button {...args} variant="icon" loading loadingLabel="Loading" leadingIcon="★" />
    </div>
  )
};


