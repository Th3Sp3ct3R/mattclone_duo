import { Card } from './Card.jsx';
import { SlotsList } from '../../storybook/AutoStories.jsx';

export default { title: 'Primitives/Card' };

export const Slots = {
  render: () => <SlotsList title="Card slots" value={Card} />
};

export const Preview = {
  render: () => <Card>Card content</Card>
};
