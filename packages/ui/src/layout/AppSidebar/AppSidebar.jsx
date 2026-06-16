'use client';

import { useEffect, useMemo, useState } from 'react';
import { cx } from '../../primitives/_utils/cx.js';

function resolveDefaultOpenId(items, fallbackId) {
  if (fallbackId) return fallbackId;
  const firstGroup = (items || []).find((item) => item.items && item.items.length);
  return firstGroup?.id || null;
}

function normalizeItem(item, index, parentId) {
  const id = item.id || `${parentId || 'root'}-${index}`;
  const children = Array.isArray(item.items) ? item.items : [];
  return { ...item, id, items: children };
}

function renderLinkContent(item) {
  if (typeof item.render === 'function') return item.render(item);
  return item.label;
}

function buildActiveIds(items, activePath) {
  if (!activePath) return { activeItemId: null, activeGroupId: null };
  const normalizedPath = activePath === '/' ? '/' : activePath.replace(/\/+$/, '');
  let activeItemId = null;
  let activeGroupId = null;

  items.forEach((item) => {
    if (item.items && item.items.length) {
      const activeChild = item.items.reduce((best, child) => {
        if (!child.href) return best;
        const href = child.href.replace(/\/+$/, '') || '/';
        const isExact = normalizedPath === href;
        const isPrefix = normalizedPath.startsWith(`${href}/`);
        if (!isExact && !isPrefix) return best;
        if (!best) return { child, href, isExact };
        if (isExact && !best.isExact) return { child, href, isExact };
        if (best.isExact && !isExact) return best;
        return href.length > best.href.length ? { child, href, isExact } : best;
      }, null);
      if (activeChild) {
        activeGroupId = item.id;
        activeItemId = activeChild.child.id;
      }
      return;
    }

    if (item.href) {
      const href = item.href.replace(/\/+$/, '') || '/';
      if (normalizedPath === href || normalizedPath.startsWith(`${href}/`)) {
        activeItemId = item.id;
      }
    }
  });

  return { activeItemId, activeGroupId };
}

function AppSidebarNav({ items = [], activePath, onNavigate, renderLink }) {
  const normalizedItems = useMemo(
    () => items.map((item, index) => normalizeItem(item, index)),
    [items]
  );
  const [openId, setOpenId] = useState(resolveDefaultOpenId(normalizedItems));
  const [resolvedPath, setResolvedPath] = useState(activePath || '');

  useEffect(() => {
    if (activePath) {
      setResolvedPath(activePath);
      return;
    }
    if (typeof window === 'undefined') return;
    const updatePath = () => setResolvedPath(window.location.pathname || '');
    updatePath();
    window.addEventListener('popstate', updatePath);
    return () => {
      window.removeEventListener('popstate', updatePath);
    };
  }, [activePath]);

  const { activeItemId, activeGroupId } = useMemo(
    () => buildActiveIds(normalizedItems, resolvedPath),
    [normalizedItems, resolvedPath]
  );

  useEffect(() => {
    if (activeGroupId) {
      setOpenId(activeGroupId);
    } else if (activeGroupId === null) {
      setOpenId(null);
    }
  }, [activeGroupId]);

  function handleToggle(itemId) {
    if (activeGroupId) {
      setOpenId(activeGroupId);
      return;
    }
    setOpenId((prev) => (prev === itemId ? null : itemId));
  }

  function handleNavigate(item) {
    if (typeof onNavigate === 'function') onNavigate(item);
  }

  function renderLabel(item) {
    const labelContent = renderLinkContent(item);
    return (
      <span className="c-AppSidebar__label">
        <span className="c-AppSidebar__labelInner">
          {item.icon ? <span className="c-AppSidebar__icon">{item.icon}</span> : null}
          <span className="c-AppSidebar__labelText">{labelContent}</span>
        </span>
      </span>
    );
  }

  function renderItem(item, depth = 0) {
    const isGroup = item.items && item.items.length > 0;
    const isOpen = isGroup && openId === item.id;
    const isActiveGroup = isGroup && activeGroupId === item.id;
    const isActiveItem = !isGroup && activeItemId === item.id;
    const indent = { '--nav-depth': depth };

    if (isGroup) {
      return (
        <div key={item.id} className="c-AppSidebar__group" style={indent}>
          <button
            type="button"
            className={cx(
              'c-AppSidebar__toggle',
              'c-NavLink',
              isOpen && 'is-open',
              isActiveGroup && 'is-active'
            )}
            onClick={() => handleToggle(item.id)}
            aria-expanded={isOpen}
          >
            {renderLabel(item)}
            <span className="c-AppSidebar__chevron" aria-hidden="true">
              ▾
            </span>
          </button>
          {isOpen ? (
            <div className="c-AppSidebar__children">
              {item.items.map((child, index) =>
                renderItem(normalizeItem(child, index, item.id), depth + 1)
              )}
            </div>
          ) : null}
        </div>
      );
    }

    const linkBody = renderLabel(item);
    const linkClassName = cx('c-AppSidebar__link', 'c-NavLink', isActiveItem && 'is-active');

    if (renderLink) {
      return (
        <div key={item.id} className="c-AppSidebar__item" style={indent}>
          {renderLink({ item, onNavigate, children: linkBody, className: linkClassName })}
        </div>
      );
    }

    return (
      <div key={item.id} className="c-AppSidebar__item" style={indent}>
        <a
          href={item.href || '#'}
          className={linkClassName}
          onClick={(event) => {
            if (!item.href) event.preventDefault();
            handleNavigate(item);
          }}
          aria-current={isActiveItem ? 'page' : undefined}
        >
          {linkBody}
        </a>
      </div>
    );
  }

  return <nav className="c-AppSidebar__nav">{normalizedItems.map((item) => renderItem(item))}</nav>;
}

export function AppSidebar({
  items = [],
  activePath,
  renderLink,
  onNavigate,
  brand,
  footer,
  className = '',
  children
}) {
  return (
    <aside className={cx('c-AppSidebar', className)}>
      {brand ? <div className="c-AppSidebar__brand">{brand}</div> : null}
      {items.length ? (
        <AppSidebarNav
          items={items}
          activePath={activePath}
          onNavigate={onNavigate}
          renderLink={renderLink}
        />
      ) : null}
      {children}
      {footer ? <div className="c-AppSidebar__footer">{footer}</div> : null}
    </aside>
  );
}
