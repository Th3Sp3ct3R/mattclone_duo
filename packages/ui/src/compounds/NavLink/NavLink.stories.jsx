import { NavLink } from './NavLink.jsx';

export default {
  title: 'Components/NavLink',
  component: NavLink
};

export function Basic() {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <NavLink href="/">Home</NavLink>
      <NavLink href="/settings">Settings</NavLink>
    </div>
  );
}




