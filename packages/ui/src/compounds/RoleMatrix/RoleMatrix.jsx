import { cx } from '../../primitives/_utils/cx.js';

export function RoleMatrix({ roles = [], permissions = [], className = '' }) {
  return (
    <div className={cx('c-RoleMatrix', className)}>
      <div className="c-RoleMatrix__header">
        <div className="c-RoleMatrix__cell c-RoleMatrix__cell--label">Capability</div>
        {roles.map((role) => (
          <div key={role.value} className="c-RoleMatrix__cell c-RoleMatrix__cell--role">
            {role.label}
          </div>
        ))}
      </div>
      <div className="c-RoleMatrix__body">
        {permissions.map((perm) => (
          <div key={perm.key} className="c-RoleMatrix__row">
            <div className="c-RoleMatrix__cell c-RoleMatrix__cell--label">
              <div className="c-RoleMatrix__label">{perm.label}</div>
              {perm.description ? (
                <div className="c-RoleMatrix__description">{perm.description}</div>
              ) : null}
            </div>
            {roles.map((role) => (
              <div key={`${perm.key}-${role.value}`} className="c-RoleMatrix__cell">
                {perm.allowedRoles?.includes(role.value) ? '✓' : '—'}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

