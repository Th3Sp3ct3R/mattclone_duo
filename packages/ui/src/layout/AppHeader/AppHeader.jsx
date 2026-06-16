import { Button } from '../../primitives/Button/Button.jsx';
import { cx } from '../../primitives/_utils/cx.js';

/**
 * Minimal app header composed from primitives.
 *
 * - `brand`: left-side brand slot (node)
 * - `actions`: right-side actions slot (node)
 * - `children`: optional additional content between brand and actions (rare)
 */
export function AppHeader({
  className = '',
  brand = null,
  actions = null,
  children = null,
  ...props
}) {
  return (
    <header className={cx('c-AppHeader', className)} {...props}>
      <div className="c-AppHeader__brand">{brand}</div>
      {children}
      <div className="c-AppHeader__actions">{actions}</div>
    </header>
  );
}

export function AppHeaderAction(props) {
  return <Button {...props} />;
}




