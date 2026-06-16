import { renderToString } from 'react-dom/server';
import * as UI from '../index.js';

test('ui exports primitives', () => {
  // React.forwardRef returns a React element type object, not a plain function.
  const expectedSubset = [
    'Accordion',
    'AlertDialog',
    'Autocomplete',
    'Avatar',
    'AppHeader',
    'AppHeaderAction',
    'AppSidebar',
    'Breadcrumbs',
    'Button',
    'Card',
    'Checkbox',
    'CheckboxGroup',
    'Collapsible',
    'Combobox',
    'ContextMenu',
    'Dialog',
    'DirectionProvider',
    'Field',
    'Fieldset',
    'Form',
    'Input',
    'Menu',
    'Menubar',
    'Meter',
    'NavLink',
    'NavigationMenu',
    'NumberField',
    'PageLayout',
    'Popover',
    'PreviewCard',
    'Progress',
    'Radio',
    'RadioGroup',
    'ScrollArea',
    'Select',
    'Separator',
    'Slider',
    'Spinner',
    'Switch',
    'Tabs',
    'Toast',
    'Toggle',
    'ToggleGroup',
    'Toolbar',
    'Tooltip'
  ];

  const exportedKeys = Object.keys(UI);
  expectedSubset.forEach((key) => {
    expect(exportedKeys).toContain(key);
  });
  expect(UI.Card).toBeTruthy();
  expect(typeof UI.Card).toBe('object');
});

test('core primitives render (smoke)', () => {
  expect(renderToString(<UI.Button>Hi</UI.Button>)).toContain('Hi');
  expect(renderToString(<UI.Input aria-label="x" />)).toContain('aria-label');
  expect(renderToString(<UI.Card>Card</UI.Card>)).toContain('Card');
  expect(
    renderToString(
      <UI.Checkbox.Root aria-label="c">
        <UI.Checkbox.Indicator />
      </UI.Checkbox.Root>
    )
  ).toContain('aria-label');
  expect(
    renderToString(<UI.NavLink href="/account">Account</UI.NavLink>)
  ).toContain('Account');
  expect(
    renderToString(
      <UI.Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Settings' }
        ]}
      />
    )
  ).toContain('Settings');
});


