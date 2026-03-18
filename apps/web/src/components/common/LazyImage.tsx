import { useState, useRef, useEffect, type ImgHTMLAttributes } from 'react';

interface LazyImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  /** Explicit width to prevent CLS */
  width: number;
  /** Explicit height to prevent CLS */
  height: number;
  /** Optional blur placeholder data-URI or low-res URL */
  placeholder?: string;
  /** Threshold for IntersectionObserver (0–1) */
  threshold?: number;
}

/**
 * Lazy-loaded image component optimized for Lighthouse performance.
 * - Uses native loading="lazy" + decoding="async"
 * - IntersectionObserver for below-fold images
 * - Blur placeholder while loading to avoid layout shift
 * - Requires width/height for CLS prevention
 */
export function LazyImage({
  src,
  alt,
  width,
  height,
  placeholder,
  threshold = 0.1,
  className = '',
  style,
  ...rest
}: LazyImageProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;

    // If IntersectionObserver is unavailable, render immediately
    if (!('IntersectionObserver' in window)) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin: '200px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  const aspectRatio = width && height ? width / height : undefined;

  return (
    <div
      ref={imgRef}
      className={`overflow-hidden ${className}`}
      style={{
        width: '100%',
        maxWidth: width,
        aspectRatio,
        backgroundColor: 'var(--bg2)',
        ...style,
      }}
    >
      {/* Blur placeholder */}
      {placeholder && !isLoaded && (
        <img
          src={placeholder}
          alt=""
          aria-hidden="true"
          width={width}
          height={height}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'blur(20px)',
            transform: 'scale(1.1)',
          }}
        />
      )}

      {/* Actual image — only rendered when in viewport */}
      {isVisible && src && (
        <img
          src={src}
          alt={alt ?? ''}
          width={width}
          height={height}
          loading="lazy"
          decoding="async"
          onLoad={() => setIsLoaded(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease-in-out',
            position: placeholder ? 'absolute' : undefined,
            top: placeholder ? 0 : undefined,
            left: placeholder ? 0 : undefined,
          }}
          {...rest}
        />
      )}
    </div>
  );
}
