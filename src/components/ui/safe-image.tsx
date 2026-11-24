'use client';

import React from 'react';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
}

export function SafeImage({
  src,
  alt,
  style,
  fallbackSrc = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="300" height="200" fill="%23f1f5f9"/><text x="50%" y="50%" fill="%2394a3b8" font-size="14" font-family="sans-serif" dominant-baseline="middle" text-anchor="middle">BD Mart Item</text></svg>',
  ...props
}: SafeImageProps) {
  return (
    <img
      src={src}
      alt={alt || 'Product image'}
      style={style}
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).src = fallbackSrc;
      }}
      {...props}
    />
  );
}
