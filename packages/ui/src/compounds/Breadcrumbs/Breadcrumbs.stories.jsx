import { Breadcrumbs } from './Breadcrumbs.jsx';

export default {
  title: 'Components/Breadcrumbs',
  component: Breadcrumbs
};

export function Basic() {
  return (
    <Breadcrumbs
      items={[
        { label: 'Home', href: '/' },
        { label: 'Projects', href: '/projects' },
        { label: 'Alpha' }
      ]}
    />
  );
}




