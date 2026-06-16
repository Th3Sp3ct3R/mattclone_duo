import { cx } from '../../primitives/_utils/cx.js';

export function SectionBand({
  as: As = 'section',
  tone = 'light',
  className = '',
  children,
  ...props
}) {
  return (
    <As className={cx('c-SectionBand', `c-SectionBand--${tone}`, className)} {...props}>
      {children}
    </As>
  );
}

