import { Card } from '../../primitives/Card/Card.jsx';
import { NestedTabNavigator } from './NestedTabNavigator.jsx';

export default { title: 'Layout/NestedTabNavigator' };

const tabs = [
  {
    value: 'content',
    label: 'Content',
    content: (
      <Card>
        <div style={{ display: 'grid', gap: 8 }}>
          <strong>Content</strong>
          <div>Primary content goes here.</div>
        </div>
      </Card>
    )
  },
  {
    value: 'publishing',
    label: 'Publishing',
    content: (
      <Card>
        <div style={{ display: 'grid', gap: 8 }}>
          <strong>Publishing</strong>
          <div>Status, dates, and language settings.</div>
        </div>
      </Card>
    )
  },
  {
    value: 'metadata',
    label: 'Metadata',
    content: (
      <Card>
        <div style={{ display: 'grid', gap: 8 }}>
          <strong>Metadata</strong>
          <div>Tags, author, and categories.</div>
        </div>
      </Card>
    )
  },
  {
    value: 'seo',
    label: 'SEO',
    children: [
      {
        value: 'basics',
        label: 'Basics',
        content: (
          <Card>
            <div style={{ display: 'grid', gap: 8 }}>
              <strong>SEO basics</strong>
              <div>Meta title, description, canonical.</div>
            </div>
          </Card>
        )
      },
      {
        value: 'advanced',
        label: 'Advanced',
        content: (
          <Card>
            <div style={{ display: 'grid', gap: 8 }}>
              <strong>Advanced SEO</strong>
              <div>Structured data and hreflang overrides.</div>
            </div>
          </Card>
        )
      }
    ]
  }
];

export const Preview = {
  render: () => <NestedTabNavigator tabs={tabs} />
};

