import { cx } from '../../primitives/_utils/cx.js';

export function NavLink({
  className = '',
  activeClassName = 'is-active',
  isActive = false,
  href = null,
  to = null,
  renderLink = null,
  children = null,
  ...props
}) {
  const resolvedHref = href ?? to;
  const resolvedClassName = cx(
    'c-NavLink',
    className,
    isActive ? activeClassName : ''
  );

  if (typeof renderLink === 'function') {
    return renderLink({
      className: resolvedClassName,
      href: resolvedHref,
      isActive,
      children,
      ...props
    });
  }

  if (!resolvedHref) {
    return (
      <span className={resolvedClassName} {...props}>
        {children}
      </span>
    );
  }

  return (
    <a className={resolvedClassName} href={resolvedHref} {...props}>
      {children}
    </a>
  );
}




