import { cx } from '../../primitives/_utils/cx.js';

export function Section({
  title,
  eyebrow,
  description,
  actions,
  children,
  className = '',
  ...props
}) {
  return (
    <section className={cx('c-Section', className)} {...props}>
      {(title || eyebrow || description || actions) && (
        <div className="c-Section__header">
          <div className="c-Section__heading">
            {eyebrow ? <div className="c-Section__eyebrow">{eyebrow}</div> : null}
            {title ? <h2 className="c-Section__title">{title}</h2> : null}
            {description ? <p className="c-Section__description">{description}</p> : null}
          </div>
          {actions ? <div className="c-Section__actions">{actions}</div> : null}
        </div>
      )}
      <div className="c-Section__content">{children}</div>
    </section>
  );
}

