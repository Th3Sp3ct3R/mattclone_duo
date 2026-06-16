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

export function PostCard({
  imageUrl,
  imageAlt,
  title,
  excerpt,
  meta,
  href,
  renderLink,
  actionLabel = 'Read more',
  className = '',
  featured = false
}) {
  return (
    <Card className={cx('c-PostCard', featured && 'c-PostCard--featured', className)}>
      {imageUrl ? (
        <div className="c-PostCard__media">
          <img className="c-PostCard__image" src={imageUrl} alt={imageAlt || ''} loading="lazy" />
        </div>
      ) : null}
      {meta ? <div className="c-PostCard__meta">{meta}</div> : null}
      {resolveLink({
        href,
        renderLink,
        className: 'c-PostCard__title',
        children: title
      })}
      {excerpt ? <p className="c-PostCard__excerpt">{excerpt}</p> : null}
      <div className="c-PostCard__action">
        {resolveLink({
          href,
          renderLink,
          className: 'c-PostCard__link',
          children: actionLabel
        })}
      </div>
    </Card>
  );
}

