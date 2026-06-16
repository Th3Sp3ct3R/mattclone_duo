import { Button } from '../../primitives/Button/Button.jsx';
import { Card } from '../../primitives/Card/Card.jsx';
import { Section } from './Section.jsx';

export default { title: 'Layout/Section' };

export const Preview = {
  render: () => (
    <Section
      eyebrow="Overview"
      title="Build products faster"
      description="Reusable packages and consistent foundations across web and mobile."
      actions={
        <>
          <Button>Get started</Button>
          <Button variant="secondary">Docs</Button>
        </>
      }
    >
      <div className="grid">
        <Card>Card one</Card>
        <Card>Card two</Card>
        <Card>Card three</Card>
      </div>
    </Section>
  )
};

