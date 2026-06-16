'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../primitives/Button/Button.jsx';
import { cx } from '../../primitives/_utils/cx.js';

function isActiveLink(pathname, href) {
  const normalizedPath = pathname === '/' ? '/' : pathname.replace(/\/+$/, '');
  const normalizedHref = href === '/' ? '/' : href.replace(/\/+$/, '');
  if (normalizedHref === '/') return normalizedPath === '/';
  return normalizedPath === normalizedHref || normalizedPath.startsWith(`${normalizedHref}/`);
}

export function AppHeaderNav({
  links = [],
  cta,
  activePath,
  activeHref = '',
  scrollSpyAnchors = [],
  scrollSpyOffset = 120,
  className = ''
}) {
  const [resolvedPath, setResolvedPath] = useState(activePath || '');
  const [resolvedHash, setResolvedHash] = useState('');
  const [scrollSpyHref, setScrollSpyHref] = useState('');

  const normalizedAnchors = useMemo(
    () =>
      scrollSpyAnchors
        .map((href) => ({ href, id: href.split('#')[1] }))
        .filter((item) => item.id),
    [scrollSpyAnchors]
  );

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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const updateHash = () => setResolvedHash(window.location.hash || '');
    updateHash();
    window.addEventListener('hashchange', updateHash);
    return () => {
      window.removeEventListener('hashchange', updateHash);
    };
  }, []);

  useEffect(() => {
    if (!normalizedAnchors.length) return;
    if (typeof window === 'undefined') return;

    let rafId = null;
    const updateActiveAnchor = () => {
      const offset = scrollSpyOffset;
      let nextActive = '';
      const firstAnchor = normalizedAnchors[0];
      if (firstAnchor) {
        const firstElement = document.getElementById(firstAnchor.id);
        if (firstElement) {
          const firstTop = firstElement.getBoundingClientRect().top;
          if (firstTop - offset > 0) {
            setScrollSpyHref('');
            return;
          }
        }
      }
      normalizedAnchors.forEach(({ href, id }) => {
        const element = document.getElementById(id);
        if (!element) return;
        const top = element.getBoundingClientRect().top;
        if (top - offset <= 0) {
          nextActive = href;
        }
      });
      setScrollSpyHref(nextActive);
    };

    const handleScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        updateActiveAnchor();
      });
    };

    updateActiveAnchor();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    return () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [normalizedAnchors, scrollSpyOffset]);

  return (
    <div className={cx('c-AppHeaderNav', className)}>
      {links.map((link) => {
        const resolvedActiveHref = activeHref || scrollSpyHref;
        const active = resolvedActiveHref
          ? resolvedActiveHref === link.href
          : link.href.startsWith('#')
            ? resolvedHash === link.href
            : isActiveLink(resolvedPath, link.href);
        return (
          <a
            key={link.href}
            href={link.href}
            className={cx('c-AppHeaderNav__link', active && 'is-active')}
            aria-current={active ? 'page' : undefined}
          >
            {link.label}
          </a>
        );
      })}
      {cta?.href && cta?.label ? (
        <a className="c-AppHeaderNav__cta" href={cta.href}>
          <Button>{cta.label}</Button>
        </a>
      ) : null}
    </div>
  );
}
