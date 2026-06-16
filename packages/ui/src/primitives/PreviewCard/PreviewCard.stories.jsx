import { PreviewCard } from './PreviewCard.jsx';
import { SlotsList } from '../../storybook/AutoStories.jsx';
import { Button } from '../Button/Button.jsx';

export default { title: 'Primitives/PreviewCard' };

export const Slots = {
  render: () => <SlotsList title="PreviewCard slots" value={PreviewCard} />
};

export const Preview = {
  render: () => (
    <PreviewCard.Root defaultOpen>
      <PreviewCard.Trigger>
        <Button>Hover/Focus me</Button>
      </PreviewCard.Trigger>
      <PreviewCard.Portal>
        <PreviewCard.Backdrop />
        <PreviewCard.Positioner>
          <PreviewCard.Popup>
            Preview content
            <PreviewCard.Arrow />
          </PreviewCard.Popup>
        </PreviewCard.Positioner>
      </PreviewCard.Portal>
    </PreviewCard.Root>
  )
};
