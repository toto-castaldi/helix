import { useState, useRef, useCallback, useEffect } from 'react'
import { Play, Pause } from 'lucide-react'
import { supabase } from '@/shared/lib/supabase'
import { cn } from '@/shared/lib/utils'

interface GalleryImage {
  id: string
  storage_path: string
  original_path: string
}

interface ImageGalleryProps {
  images: GalleryImage[]
  className?: string
}

export function ImageGallery({ images, className }: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loadedImages, setLoadedImages] = useState<Record<number, boolean>>({})
  const [errorImages, setErrorImages] = useState<Record<number, boolean>>({})
  const [isPlaying, setIsPlaying] = useState(false)

  // Touch tracking refs for gesture isolation
  const touchStartX = useRef<number | null>(null)
  const touchCurrentX = useRef<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isMultiImage = images.length > 1

  // Auto-play interval logic
  useEffect(() => {
    if (isPlaying && isMultiImage) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex(prev => (prev >= images.length - 1) ? 0 : prev + 1)
      }, 3000)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isPlaying, isMultiImage, images.length])

  // Tap-to-toggle auto-play (only for multi-image)
  const handleTap = useCallback(() => {
    if (!isMultiImage) return
    setIsPlaying(prev => !prev)
  }, [isMultiImage])

  const getImageUrl = useCallback((storagePath: string): string => {
    const { data } = supabase.storage.from('lumio-images').getPublicUrl(storagePath)
    return data.publicUrl
  }, [])

  const handleImageLoad = useCallback((index: number) => {
    setLoadedImages((prev) => ({ ...prev, [index]: true }))
  }, [])

  const handleImageError = useCallback((index: number) => {
    setErrorImages((prev) => ({ ...prev, [index]: true }))
  }, [])

  // Touch handlers with stopPropagation to isolate from parent carousel
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isMultiImage) return
    e.stopPropagation()
    touchStartX.current = e.touches[0].clientX
    touchCurrentX.current = e.touches[0].clientX
  }, [isMultiImage])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isMultiImage) return
    e.stopPropagation()
    touchCurrentX.current = e.touches[0].clientX
  }, [isMultiImage])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isMultiImage) return
    e.stopPropagation()

    if (touchStartX.current === null || touchCurrentX.current === null) return

    const distance = touchStartX.current - touchCurrentX.current
    const threshold = 30
    const isValidSwipe = Math.abs(distance) > threshold

    // Stop auto-play on valid swipe
    if (isValidSwipe && isPlaying) {
      setIsPlaying(false)
    }

    if (distance > threshold && currentIndex < images.length - 1) {
      // Swipe left -> next image
      setCurrentIndex((prev) => prev + 1)
    } else if (distance < -threshold && currentIndex > 0) {
      // Swipe right -> previous image
      setCurrentIndex((prev) => prev - 1)
    }

    touchStartX.current = null
    touchCurrentX.current = null
  }, [isMultiImage, currentIndex, images.length, isPlaying])

  if (images.length === 0) return null

  // Filter out errored images for display count check
  const visibleImages = images.filter((_, i) => !errorImages[i])
  if (visibleImages.length === 0) return null

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg h-full',
        isPlaying && isMultiImage && 'ring-2 ring-amber-400/60',
        className
      )}
      onClick={handleTap}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Sliding image track */}
      <div
        className="flex h-full transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {images.map((image, index) => (
          <div
            key={image.id}
            className="w-full h-full flex-shrink-0 flex items-center justify-center bg-black rounded-lg"
          >
            {errorImages[index] ? null : (
              <>
                {/* Skeleton placeholder */}
                {!loadedImages[index] && (
                  <div
                    className="w-full h-full bg-gray-700 animate-pulse rounded-lg"
                  />
                )}
                <img
                  src={getImageUrl(image.storage_path)}
                  alt={image.original_path}
                  className={cn(
                    'object-contain max-w-full max-h-full rounded-lg select-none pointer-events-none',
                    !loadedImages[index] && 'hidden'
                  )}
                  onLoad={() => handleImageLoad(index)}
                  onError={() => handleImageError(index)}
                  draggable={false}
                />
              </>
            )}
          </div>
        ))}
      </div>

      {/* Play/pause icon overlay (multi-image only) */}
      {isMultiImage && (
        <div className="absolute top-2 right-2 z-10 bg-black/50 rounded-full p-1 pointer-events-none">
          {isPlaying ? (
            <Pause className="w-5 h-5 text-white" />
          ) : (
            <Play className="w-5 h-5 text-white" />
          )}
        </div>
      )}

      {/* Dot indicators (multi-image only) */}
      {isMultiImage && (
        <div className="flex items-center justify-center gap-1 mt-1">
          {images.map((image, index) => (
            <button
              key={image.id}
              className={cn(
                'w-1.5 h-1.5 rounded-full transition-colors',
                index === currentIndex ? 'bg-amber-400' : 'bg-white/40'
              )}
              onClick={(e) => {
                e.stopPropagation()
                if (isPlaying) setIsPlaying(false)
                setCurrentIndex(index)
              }}
              aria-label={`Image ${index + 1} of ${images.length}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
