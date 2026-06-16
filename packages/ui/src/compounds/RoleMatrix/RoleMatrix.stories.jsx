import { RoleMatrix } from './RoleMatrix.jsx';

export default { title: 'Compounds/RoleMatrix' };

const roles = [
  { value: 'su', label: 'Super User' },
  { value: 'admin', label: 'Admin' },
  { value: 'contributor', label: 'Contributor' },
  { value: 'user', label: 'User' }
];

const permissions = [
  {
    key: 'users',
    label: 'Manage users',
    description: 'Create, edit, and remove users',
    allowedRoles: ['su']
  },
  {
    key: 'seo',
    label: 'Manage SEO',
    description: 'Update SEO settings and overrides',
    allowedRoles: ['admin', 'su']
  },
  {
    key: 'blog',
    label: 'Manage blog',
    description: 'Create and publish posts',
    allowedRoles: ['contributor', 'admin', 'su']
  }
];

export const Preview = {
  render: () => <RoleMatrix roles={roles} permissions={permissions} />
};

