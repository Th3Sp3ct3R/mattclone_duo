import { cx } from '../../primitives/_utils/cx.js';

export function FormErrorSummary({
  title = 'Please fix the highlighted fields.',
  messages = [],
  status,
  className = ''
}) {
  const items = Array.from(
    new Set([...(messages || []).filter(Boolean), status].filter(Boolean))
  );

  if (!items.length) return null;

  return (
    <div className={cx('ui-FormErrorSummary', className)} role="alert" aria-live="polite">
      {title ? <div className="ui-FormErrorSummary__title">{title}</div> : null}
      <ul className="ui-FormErrorSummary__list">
        {items.map((message) => (
          <li key={message} className="ui-FormErrorSummary__item">
            {message}
          </li>
        ))}
      </ul>
    </div>
  );
}


