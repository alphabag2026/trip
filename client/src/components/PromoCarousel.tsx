import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PromoSlide {
  id: string;
  imageUrl: string;
  title?: string;
  subtitle?: string;
  href?: string;
  badge?: string;
}

interface PromoCarouselProps {
  slides: PromoSlide[];
  autoPlayInterval?: number; // ms, default 4000
  className?: string;
}

export default function PromoCarousel({
  slides,
  autoPlayInterval = 4000,
  className = "",
}: PromoCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const slideCount = slides.length;

  // Auto-play
  useEffect(() => {
    if (isHovered || slideCount <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slideCount);
    }, autoPlayInterval);
    return () => clearInterval(timer);
  }, [isHovered, slideCount, autoPlayInterval]);

  const goTo = useCallback(
    (index: number) => {
      setCurrentIndex(((index % slideCount) + slideCount) % slideCount);
    },
    [slideCount]
  );

  const goNext = useCallback(() => goTo(currentIndex + 1), [currentIndex, goTo]);
  const goPrev = useCallback(() => goTo(currentIndex - 1), [currentIndex, goTo]);

  // Touch / Swipe handlers
  const minSwipeDistance = 50;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
    if (touchStart !== null) {
      setDragOffset(e.targetTouches[0].clientX - touchStart);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setDragOffset(0);
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (Math.abs(distance) >= minSwipeDistance) {
      if (distance > 0) goNext();
      else goPrev();
    }
    setTouchStart(null);
    setTouchEnd(null);
  };

  // Mouse drag for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    setTouchStart(e.clientX);
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || touchStart === null) return;
    setDragOffset(e.clientX - touchStart);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (touchStart !== null) {
      const distance = touchStart - e.clientX;
      if (Math.abs(distance) >= minSwipeDistance) {
        if (distance > 0) goNext();
        else goPrev();
      }
    }
    setIsDragging(false);
    setDragOffset(0);
    setTouchStart(null);
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false);
      setDragOffset(0);
      setTouchStart(null);
    }
  };

  if (slideCount === 0) return null;

  const slideContent = (slide: PromoSlide, index: number) => {
    const inner = (
      <div className="relative w-full h-full overflow-hidden rounded-xl">
        <img
          src={slide.imageUrl}
          alt={slide.title || `Promo ${index + 1}`}
          className="w-full h-full object-cover"
          draggable={false}
        />
        {/* Overlay text */}
        {(slide.title || slide.subtitle || slide.badge) && (
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent flex items-end">
            <div className="p-4 pb-5">
              {slide.badge && (
                <span className="inline-block bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded mb-1.5">
                  {slide.badge}
                </span>
              )}
              {slide.title && (
                <h3 className="text-white text-sm md:text-base font-bold leading-tight">
                  {slide.title}
                </h3>
              )}
              {slide.subtitle && (
                <p className="text-white/80 text-xs mt-0.5">{slide.subtitle}</p>
              )}
            </div>
          </div>
        )}
        {/* Slide counter */}
        <div className="absolute bottom-2 right-3 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full">
          {index + 1}/{slideCount}
        </div>
      </div>
    );

    if (slide.href) {
      return (
        <a
          href={slide.href}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full h-full"
          onClick={(e) => isDragging && Math.abs(dragOffset) > 5 && e.preventDefault()}
        >
          {inner}
        </a>
      );
    }
    return inner;
  };

  return (
    <div
      ref={containerRef}
      className={`relative group ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        handleMouseLeave();
      }}
    >
      {/* Slides container */}
      <div
        className="overflow-hidden rounded-xl cursor-grab active:cursor-grabbing"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <div
          className="flex"
          style={{
            transform: `translateX(calc(-${currentIndex * 100}% + ${isDragging ? dragOffset : 0}px))`,
            transition: isDragging ? "none" : "transform 500ms cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {slides.map((slide, i) => (
            <div
              key={slide.id}
              className="w-full flex-shrink-0"
              style={{ aspectRatio: "16/7" }}
            >
              {slideContent(slide, i)}
            </div>
          ))}
        </div>
      </div>

      {/* Navigation arrows - show on hover (desktop) */}
      {slideCount > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 dark:bg-black/50 shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white dark:hover:bg-black/70 z-10"
            aria-label="Previous"
          >
            <ChevronLeft className="h-4 w-4 text-gray-700 dark:text-gray-200" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 dark:bg-black/50 shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white dark:hover:bg-black/70 z-10"
            aria-label="Next"
          >
            <ChevronRight className="h-4 w-4 text-gray-700 dark:text-gray-200" />
          </button>
        </>
      )}

      {/* Indicator dots */}
      {slideCount > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`rounded-full transition-all duration-300 ${
                i === currentIndex
                  ? "w-5 h-2 bg-blue-500"
                  : "w-2 h-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400"
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
