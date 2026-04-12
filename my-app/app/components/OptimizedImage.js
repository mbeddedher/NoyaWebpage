'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';

function isRemoteUrl(s) {
  return typeof s === 'string' && /^https?:\/\//i.test(s);
}

/**
 * next/image wrapper: local paths use optimization; remote URLs use unoptimized (no remotePatterns required).
 * SVG and absolute URLs are safe with next.config images.dangerouslyAllowSVG / unoptimized.
 */
export default function OptimizedImage({
  src,
  alt = '',
  width,
  height,
  fill,
  className,
  sizes,
  priority,
  fallback = '/no-image.svg',
  style,
  ...rest
}) {
  const [resolved, setResolved] = useState(() => src || fallback);

  useEffect(() => {
    setResolved(src || fallback);
  }, [src, fallback]);

  const unoptimized = isRemoteUrl(resolved);

  const handleError = () => {
    if (resolved !== fallback) setResolved(fallback);
  };

  if (fill) {
    return (
      <Image
        src={resolved}
        alt={alt}
        fill
        className={className}
        sizes={sizes || '100vw'}
        priority={priority}
        unoptimized={unoptimized}
        style={style}
        onError={handleError}
        {...rest}
      />
    );
  }

  const w = width ?? 48;
  const h = height ?? 48;

  return (
    <Image
      src={resolved}
      alt={alt}
      width={w}
      height={h}
      className={className}
      sizes={sizes}
      priority={priority}
      unoptimized={unoptimized}
      style={style}
      onError={handleError}
      {...rest}
    />
  );
}
