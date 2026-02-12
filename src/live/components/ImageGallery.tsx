import { useState, useRef, useCallback } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { cn } from '@/shared/lib/utils'
import type { LumioCardImage } from '@/shared/types'

interface ImageGalleryProps {
  images: LumioCardImage[]
  maxHeight: string
  className?: string
}

export function ImageGallery({ images, maxHeight, className }: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loadedImages, setLoadedImages] = useState<Record<number, boolean>>({})
  const [errorImages, setErrorImages] = useState<Record<number, boolean>>({})

  // Touch tracking refs for gesture isolation
  const touchStartX = useRef<number | null>(null)
  const touchCurrentX = useRef<number | null>(null)

  const isMultiImage = images.length > 1

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

    if (distance > threshold && currentIndex < images.length - 1) {
      // Swipe left -> next image
      setCurrentIndex((prev) => prev + 1)
    } else if (distance < -threshold && currentIndex > 0) {
      // Swipe right -> previous image
      setCurrentIndex((prev) => prev - 1)
    }

    touchStartX.current = null
    touchCurrentX.current = null
  }, [isMultiImage, currentIndex, images.length])

  if (images.length === 0) return null

  // Filter out errored images for display count check
  const visibleImages = images.filter((_, i) => !errorImages[i])
  if (visibleImages.length === 0) return null

  return (
    <div
      className={cn('relative overflow-hidden rounded-lg', className)}
      style={{ maxHeight }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Sliding image track */}
      <div
        className="flex transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {images.map((image, index) => (
          <div
            key={image.id}
            className="w-full flex-shrink-0 flex items-center justify-center"
            style={{ maxHeight }}
          >
            {errorImages[index] ? null : (
              <>
                {/* Skeleton placeholder */}
                {!loadedImages[index] && (
                  <div
                    className="w-full bg-gray-700 animate-pulse rounded-lg"
                    style={{ height: maxHeight }}
                  />
                )}
                <img
                  src={getImageUrl(image.storage_path)}
                  alt={image.original_path}
                  className={cn(
                    'object-contain w-full rounded-lg select-none pointer-events-none',
                    !loadedImages[index] && 'hidden'
                  )}
                  style={{ maxHeight }}
                  onLoad={() => handleImageLoad(index)}
                  onError={() => handleImageError(index)}
                  draggable={false}
                />
              </>
            )}
          </div>
        ))}
      </div>

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
              onClick={() => setCurrentIndex(index)}
              aria-label={`Image ${index + 1} of ${images.length}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
