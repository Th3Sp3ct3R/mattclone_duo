import * as React from 'react';
import { Avatar as BaseAvatar } from '@base-ui/react/avatar';
import { cx } from '../_utils/cx.js';

const Fallback = React.forwardRef(function AvatarFallback({ className = '', ...props }, ref) {
  return (
    <BaseAvatar.Fallback
      ref={ref}
      className={cx('ui-AvatarFallback', className)}
      {...props}
    />
  );
});

const Image = React.forwardRef(function AvatarImage({ className = '', ...props }, ref) {
  return (
    <BaseAvatar.Image
      ref={ref}
      className={cx('ui-AvatarImage', className)}
      {...props}
    />
  );
});

const Root = React.forwardRef(function AvatarRoot({ className = '', ...props }, ref) {
  return (
    <BaseAvatar.Root
      ref={ref}
      className={cx('ui-AvatarRoot', className)}
      {...props}
    />
  );
});

export const Avatar = {
  ...BaseAvatar,
  Fallback, Image, Root
};
