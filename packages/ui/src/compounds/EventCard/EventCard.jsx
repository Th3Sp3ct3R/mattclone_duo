import { Card } from '../../primitives/Card/Card.jsx';
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

export function EventCard({
  title,
  summary,
  meta,
  location,
  href,
  renderLink,
  actionLabel = 'View event',
  className = ''
}) {
  return (
    <Card className={cx('c-EventCard', className)}>
      {meta ? <div className="c-EventCard__meta">{meta}</div> : null}
      {resolveLink({
        href,
        renderLink,
        className: 'c-EventCard__title',
        children: title
      })}
      {location ? <div className="c-EventCard__location">{location}</div> : null}
      {summary ? <p className="c-EventCard__summary">{summary}</p> : null}
      <div className="c-EventCard__action">
        {resolveLink({
          href,
          renderLink,
          className: 'c-EventCard__link',
          children: actionLabel
        })}
      </div>
    </Card>
  );
}
