import { getAllTimezoneOptions } from '@julio/shared';
import { cx } from '../../primitives/_utils/cx.js';

export function TimezoneSelect({
  value,
  options,
  onChange,
  onBlur,
  name,
  id,
  disabled = false,
  className = ''
}) {
  const resolvedOptions = options && options.length ? options : getAllTimezoneOptions();

  return (
    <label className={cx('c-TimezoneSelect', className)}>
      <select
        id={id}
        name={name}
        className="form-select"
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
      >
        {resolvedOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
