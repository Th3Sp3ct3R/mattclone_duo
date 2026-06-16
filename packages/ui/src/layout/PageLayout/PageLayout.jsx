import { cx } from '../../primitives/_utils/cx.js';

/**
 * Minimal 2-column layout (sidebar + main).
 * Keeps styling minimal; provides semantic regions for composition.
 */
export function PageLayout({
  className = '',
  sidebar = null,
  children,
  ...props
}) {
  return (
    <div className={cx('c-PageLayout', className)} {...props}>
      {sidebar ? <aside className="c-PageLayout__sidebar">{sidebar}</aside> : null}
      <main className="c-PageLayout__main">{children}</main>
    </div>
  );
}




