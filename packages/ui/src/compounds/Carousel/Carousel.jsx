'use client';

import { useId, useRef } from 'react';

import { cx } from '../../primitives/_utils/cx.js';

export function Carousel({
  children,
  className = '',
  label = 'Carousel',
  showControls = true,
  prevControl = null,
  nextControl = null,
  prevLabel = 'Previous',
  nextLabel = 'Next'
}) {
  const trackRef = useRef(null);
  const trackId = useId();

  const scrollByAmount = (direction) => {
    const track = trackRef.current;
    if (!track) return;
    const amount = Math.round(track.clientWidth * 0.9);
    track.scrollBy({ left: direction * amount, behavior: 'smooth' });
  };

  return (
    <div className={cx('c-Carousel', className)} role="region" aria-label={label}>
      {showControls ? (
        <div className="c-Carousel__controls" aria-hidden="true">
          <button
            type="button"
            className="c-Carousel__control c-Carousel__control--prev"
            aria-controls={trackId}
            aria-label={prevLabel}
            onClick={() => scrollByAmount(-1)}
          >
            {prevControl || <span className="c-Carousel__controlLabel">Prev</span>}
          </button>
          <button
            type="button"
            className="c-Carousel__control c-Carousel__control--next"
            aria-controls={trackId}
            aria-label={nextLabel}
            onClick={() => scrollByAmount(1)}
          >
            {nextControl || <span className="c-Carousel__controlLabel">Next</span>}
          </button>
        </div>
      ) : null}
      <div className="c-Carousel__track" id={trackId} ref={trackRef} role="list">
        {children}
      </div>
    </div>
  );
}

export function CarouselItem({ children, className = '' }) {
  return (
    <div className={cx('c-Carousel__item', className)} role="listitem">
      {children}
    </div>
  );
}
