import { Card } from '../../primitives/Card/Card.jsx';
import { AppSidebar } from '../AppSidebar/AppSidebar.jsx';
import { NavLink } from '../../compounds/NavLink/NavLink.jsx';
import { PageLayout } from './PageLayout.jsx';

export default {
  title: 'Components/PageLayout',
  component: PageLayout
};

export function WithSidebar() {
  return (
    <PageLayout
      sidebar={
        <AppSidebar>
          <div style={{ display: 'grid', gap: 8 }}>
            <NavLink href="/">Home</NavLink>
            <NavLink href="/settings">Settings</NavLink>
          </div>
        </AppSidebar>
      }
    >
      <div className="grid">
        <Card>Content A</Card>
        <Card>Content B</Card>
      </div>
    </PageLayout>
  );
}




