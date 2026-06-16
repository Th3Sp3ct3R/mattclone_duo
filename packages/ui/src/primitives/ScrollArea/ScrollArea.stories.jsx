import { ScrollArea } from './ScrollArea.jsx';
import { SlotsList } from '../../storybook/AutoStories.jsx';

export default { title: 'Primitives/ScrollArea' };

export const Slots = {
  render: () => <SlotsList title="ScrollArea slots" value={ScrollArea} />
};

export const Preview = {
  render: () => (
    <ScrollArea.Root style={{ width: 260, height: 120, border: '1px dashed #cbd5e1' }}>
      <ScrollArea.Viewport style={{ width: '100%', height: '100%' }}>
        <ScrollArea.Content>
          <div style={{ padding: 12 }}>
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i}>Row {i + 1}</div>
            ))}
          </div>
        </ScrollArea.Content>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar orientation="vertical">
        <ScrollArea.Thumb />
      </ScrollArea.Scrollbar>
      <ScrollArea.Corner />
    </ScrollArea.Root>
  )
};
