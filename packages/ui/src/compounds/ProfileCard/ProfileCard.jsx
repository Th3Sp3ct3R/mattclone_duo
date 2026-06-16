import { Card } from '../../primitives/Card/Card.jsx';
import { cx } from '../../primitives/_utils/cx.js';

function getInitials(name) {
  if (!name) return '';
  return name
    .split(' ')
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

export function ProfileCard({ name, role, bio, imageUrl, imageAlt, className = '' }) {
  const initials = getInitials(name);

  return (
    <Card className={cx('c-ProfileCard', className)}>
      <div className="c-ProfileCard__header">
        {imageUrl ? (
          <img className="c-ProfileCard__image" src={imageUrl} alt={imageAlt || name || ''} loading="lazy" />
        ) : (
          <div className="c-ProfileCard__placeholder" aria-hidden="true">
            {initials}
          </div>
        )}
        <div className="c-ProfileCard__identity">
          {name ? <h3 className="c-ProfileCard__name">{name}</h3> : null}
          {role ? <div className="c-ProfileCard__role">{role}</div> : null}
        </div>
      </div>
      {bio ? <p className="c-ProfileCard__bio">{bio}</p> : null}
    </Card>
  );
}
