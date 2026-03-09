import { useState, useEffect } from 'react';
import { api } from '@/services/api';

interface TenderImageProps {
  tenderId: number;
  title: string;
  className?: string;
}

interface ImageData {
  url: string;
  thumb: string;
  alt: string;
  credit: string | null;
  credit_url: string | null;
  source: string;
  source_url: string | null;
}

export default function TenderImage({ tenderId, title, className = '' }: TenderImageProps) {
  const [image, setImage] = useState<ImageData | null>(null);
  const [loading, setLoading] = useState(true);

  // Guard against missing tenderId or title
  if (!tenderId || !title) {
    return (
      <div className={`bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg ${className}`} />
    );
  }

  const displayTitle = title || 'Tender';

  useEffect(() => {
    if (!tenderId) {
      setLoading(false);
      return;
    }

    const cacheKey = `tender_img_${tenderId}`;
    const cached = sessionStorage.getItem(cacheKey);

    if (cached) {
      setImage(JSON.parse(cached));
      setLoading(false);
      return;
    }

    api.get(`/tenders/image?id=${tenderId}`)
      .then((res) => {
        if (res.data.success && res.data.image) {
          sessionStorage.setItem(cacheKey, JSON.stringify(res.data.image));
          setImage(res.data.image);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [tenderId]);

  if (loading) {
    return (
      <div className={`bg-gradient-to-r from-gray-200 to-gray-300 animate-pulse rounded-lg ${className}`} />
    );
  }

  if (!image) return null;

  return (
    <div className={`relative overflow-hidden rounded-lg ${className}`}>
      <img
        src={image.url}
        alt={image.alt ?? displayTitle}
        className="w-full h-full object-cover"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          if (target.src !== image.thumb) target.src = image.thumb;
        }}
      />
      {image.credit && image.source !== 'Placeholder' && (
        <span className="absolute bottom-1 right-2 text-white text-xs bg-black bg-opacity-40 px-2 py-0.5 rounded-full">
          Photo by{' '}
          <a href={image.credit_url ?? '#'} target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80">
            {image.credit}
          </a>
          {' '}on{' '}
          <a href={image.source_url ?? '#'} target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80">
            {image.source}
          </a>
        </span>
      )}
    </div>
  );
}
