import { AppSidebar } from './AppSidebar.jsx';

export default { title: 'Layout/AppSidebar' };

const items = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard' },
  {
    id: 'blog',
    label: 'Blog',
    items: [
      { id: 'posts', label: 'Posts', href: '/admin/blog' },
      { id: 'categories', label: 'Categories', href: '/admin/blog/categories' },
      { id: 'authors', label: 'Authors', href: '/admin/blog/authors' }
    ]
  },
  { id: 'seo', label: 'SEO', href: '/seo' }
];

export const Preview = {
  render: () => <AppSidebar items={items} />
};
