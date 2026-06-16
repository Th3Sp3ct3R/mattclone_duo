import { Switch } from './Switch.jsx';
import { SlotsList } from '../../storybook/AutoStories.jsx';

export default { title: 'Primitives/Switch' };

export const Slots = {
  render: () => <SlotsList title="Switch slots" value={Switch} />
};

export const Preview = {
  render: () => (
    <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
      <Switch.Root defaultChecked aria-label="Switch">
        <Switch.Thumb />
      </Switch.Root>
      <span>Switch</span>
    </label>
  )
};
