import { Card } from '../../primitives/Card/Card.jsx';
import { Section } from '../Section/Section.jsx';
import { SectionBand } from './SectionBand.jsx';

export default { title: 'Layout/SectionBand' };

export const DarkBand = {
  render: () => (
    <SectionBand tone="dark">
      <div style={{ padding: '0 24px' }}>
        <Section title="Dark section" description="Contrast-friendly section band.">
          <Card>Card content</Card>
        </Section>
      </div>
    </SectionBand>
  )
};

