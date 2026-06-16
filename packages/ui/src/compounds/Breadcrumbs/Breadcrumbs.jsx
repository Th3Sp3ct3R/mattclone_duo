import { cx } from '../../primitives/_utils/cx.js';

export function Breadcrumbs({
  className = '',
  items = [],
  separator = '/',
  renderLink = null,
  ...props
}) {
  return (
    <nav className={cx('c-Breadcrumbs', className)} aria-label="Breadcrumbs" {...props}>
      {items.map((item, idx) => {
        const key = item.key ?? `${idx}-${String(item.label ?? '')}`;
        const isLast = idx === items.length - 1;
        const href = item.href ?? item.to ?? null;
        const content =
          href && typeof renderLink === 'function'
            ? renderLink({
                className: 'c-Breadcrumbs__link',
                href,
                item,
                children: item.label
              })
            : href
              ? (
                  <a className="c-Breadcrumbs__link" href={href}>
            {item.label}
                  </a>
                )
              : (
          <span className="c-Breadcrumbs__label">{item.label}</span>
        );

        return (
          <span key={key} className="c-Breadcrumbs__item">
            {content}
            {!isLast ? <span className="c-Breadcrumbs__sep">{separator}</span> : null}
          </span>
        );
      })}
    </nav>
  );
}




