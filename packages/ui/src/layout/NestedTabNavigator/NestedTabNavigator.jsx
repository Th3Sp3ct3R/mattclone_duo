import { Tabs } from '../../primitives/Tabs/Tabs.jsx';
import { cx } from '../../primitives/_utils/cx.js';

function resolveDefaultValue(items, fallback) {
  if (fallback) return fallback;
  if (!items || items.length === 0) return '';
  return items[0].value || '';
}

function renderTabContent(tab) {
  if (typeof tab.content === 'function') return tab.content();
  return tab.content ?? null;
}

function renderNestedTabs(tab) {
  const children = Array.isArray(tab.children) ? tab.children : [];
  if (children.length === 0) return renderTabContent(tab);

  const nestedDefaultValue = resolveDefaultValue(children, tab.defaultChildValue);

  return (
    <Tabs.Root
      className="c-NestedTabNavigator__nested"
      defaultValue={nestedDefaultValue}
    >
      <Tabs.List className="c-NestedTabNavigator__nestedList">
        {children.map((child) => (
          <Tabs.Tab key={child.value} value={child.value}>
            {child.label}
          </Tabs.Tab>
        ))}
      </Tabs.List>
      {children.map((child) => (
        <Tabs.Panel
          key={child.value}
          value={child.value}
          className="c-NestedTabNavigator__nestedPanel"
        >
          {renderTabContent(child)}
        </Tabs.Panel>
      ))}
    </Tabs.Root>
  );
}

export function NestedTabNavigator({
  tabs = [],
  defaultValue,
  value,
  onValueChange,
  className = ''
}) {
  const rootValue = resolveDefaultValue(tabs, defaultValue);

  return (
    <div className={cx('c-NestedTabNavigator', className)}>
      <Tabs.Root
        defaultValue={rootValue}
        value={value}
        onValueChange={onValueChange}
        className="c-NestedTabNavigator__root"
      >
        <Tabs.List className="c-NestedTabNavigator__list">
          {tabs.map((tab) => (
            <Tabs.Tab key={tab.value} value={tab.value}>
              {tab.label}
            </Tabs.Tab>
          ))}
        </Tabs.List>
        {tabs.map((tab) => (
          <Tabs.Panel
            key={tab.value}
            value={tab.value}
            className="c-NestedTabNavigator__panel"
          >
            {renderNestedTabs(tab)}
          </Tabs.Panel>
        ))}
      </Tabs.Root>
    </div>
  );
}

