import { NavigationMenu } from './NavigationMenu.jsx';
import { SlotsList } from '../../storybook/AutoStories.jsx';

export default { title: 'Primitives/NavigationMenu' };

export const Slots = {
  render: () => <SlotsList title="NavigationMenu slots" value={NavigationMenu} />
};

export const Preview = {
  render: () => (
    <NavigationMenu.Root defaultValue="one">
      <NavigationMenu.List>
        <NavigationMenu.Item value="one">
          <NavigationMenu.Trigger>One</NavigationMenu.Trigger>
          <NavigationMenu.Portal>
            <NavigationMenu.Backdrop />
            <NavigationMenu.Positioner>
              <NavigationMenu.Popup>
                <NavigationMenu.Content>Content</NavigationMenu.Content>
              </NavigationMenu.Popup>
            </NavigationMenu.Positioner>
          </NavigationMenu.Portal>
        </NavigationMenu.Item>
      </NavigationMenu.List>
    </NavigationMenu.Root>
  )
};
