import { cx } from '../../primitives/_utils/cx.js';

function resolveLink({ href, renderLink, className, children }) {
  if (typeof renderLink === 'function') {
    return renderLink({ href, className, children });
  }
  if (href) {
    return (
      <a className={className} href={href}>
        {children}
      </a>
    );
  }
  return <span className={className}>{children}</span>;
}

export function AppFooter({
  className = '',
  containerClassName = '',
  brand = null,
  tagline = null,
  columns = [],
  bottomLinks = [],
  copyright = null,
  renderLink
}) {
  return (
    <footer className={cx('c-AppFooter', className)}>
      <div className={cx('c-AppFooter__container', containerClassName)}>
        <div className="c-AppFooter__inner">
          <div className="c-AppFooter__brand">
            {brand}
            {tagline ? <p className="c-AppFooter__tagline">{tagline}</p> : null}
          </div>
          <div className="c-AppFooter__columns">
            {columns.map((column, columnIndex) => (
              <div key={`${column.title}-${columnIndex}`} className="c-AppFooter__column">
                <div className="c-AppFooter__title">{column.title}</div>
                <ul className="c-AppFooter__links">
                  {(column.links || []).map((link, linkIndex) => (
                    <li key={`${link.label}-${linkIndex}`}>
                      {resolveLink({
                        href: link.href,
                        renderLink,
                        className: 'c-AppFooter__link',
                        children: link.label
                      })}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="c-AppFooter__bottom">
          <div className="c-AppFooter__copyright">{copyright}</div>
          <div className="c-AppFooter__bottomLinks">
            {bottomLinks.map((link, index) => (
              <span key={`${link.label}-${index}`}>
                {resolveLink({
                  href: link.href,
                  renderLink,
                  className: 'c-AppFooter__link',
                  children: link.label
                })}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
