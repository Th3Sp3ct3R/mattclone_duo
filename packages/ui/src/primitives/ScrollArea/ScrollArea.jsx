import * as React from 'react';
import { ScrollArea as BaseScrollArea } from '@base-ui/react/scroll-area';
import { cx } from '../_utils/cx.js';

const Content = React.forwardRef(function ScrollAreaContent({ className = '', ...props }, ref) {
  return (
    <BaseScrollArea.Content
      ref={ref}
      className={cx('ui-ScrollAreaContent', className)}
      {...props}
    />
  );
});

const Corner = React.forwardRef(function ScrollAreaCorner({ className = '', ...props }, ref) {
  return (
    <BaseScrollArea.Corner
      ref={ref}
      className={cx('ui-ScrollAreaCorner', className)}
      {...props}
    />
  );
});

const Root = React.forwardRef(function ScrollAreaRoot({ className = '', ...props }, ref) {
  return (
    <BaseScrollArea.Root
      ref={ref}
      className={cx('ui-ScrollAreaRoot', className)}
      {...props}
    />
  );
});

const Scrollbar = React.forwardRef(function ScrollAreaScrollbar({ className = '', ...props }, ref) {
  return (
    <BaseScrollArea.Scrollbar
      ref={ref}
      className={cx('ui-ScrollAreaScrollbar', className)}
      {...props}
    />
  );
});

const Thumb = React.forwardRef(function ScrollAreaThumb({ className = '', ...props }, ref) {
  return (
    <BaseScrollArea.Thumb
      ref={ref}
      className={cx('ui-ScrollAreaThumb', className)}
      {...props}
    />
  );
});

const Viewport = React.forwardRef(function ScrollAreaViewport({ className = '', ...props }, ref) {
  return (
    <BaseScrollArea.Viewport
      ref={ref}
      className={cx('ui-ScrollAreaViewport', className)}
      {...props}
    />
  );
});

export const ScrollArea = {
  ...BaseScrollArea,
  Content, Corner, Root, Scrollbar, Thumb, Viewport
};
