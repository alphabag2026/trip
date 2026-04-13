import { useState, useRef, useEffect, ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface OptimizedImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  /** Skip lazy loading for above-the-fold images */
  priority?: boolean;
  /** Show blur placeholder while loading */
  blur?: boolean;
  /** Fallback element when image fails to load */
  fallback?: React.ReactNode;
}

/**
 * Optimized image component with:
 * - Native lazy loading (loading="lazy")
 * - Intersection Observer for fade-in effect
 * - Blur placeholder while loading
 * - Error fallback
 * - Automatic decoding="async"
 */
export default function OptimizedImage({
  src,
  alt = "",
  className,
  priority = false,
  blur = true,
  fallback,
  ...props
}: OptimizedImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [inView, setInView] = useState(priority);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (priority || !imgRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, [priority]);

  if (error && fallback) {
    return <>{fallback}</>;
  }

  if (error) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted text-muted-foreground text-xs",
          className
        )}
      >
        <span>이미지 로드 실패</span>
      </div>
    );
  }

  return (
    <img
      ref={imgRef}
      src={inView ? src : undefined}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      onLoad={() => setLoaded(true)}
      onError={() => setError(true)}
      className={cn(
        "transition-opacity duration-300",
        blur && !loaded && "opacity-0",
        blur && loaded && "opacity-100",
        className
      )}
      {...props}
    />
  );
}
