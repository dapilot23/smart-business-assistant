'use client';

import { useState } from 'react';
import { JobPhoto } from '@/lib/types/jobs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, Trash2, X } from 'lucide-react';
import Image from 'next/image';

interface JobPhotosProps {
  photos: JobPhoto[];
  onUpload: () => void;
  onDelete: (photoId: string) => void;
  canEdit: boolean;
}

export function JobPhotos({ photos, onUpload, onDelete, canEdit }: JobPhotosProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<JobPhoto | null>(null);

  const photoTypeColors = {
    BEFORE: 'bg-blue-500',
    DURING: 'bg-yellow-500',
    AFTER: 'bg-green-500',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Photos</h3>
        {canEdit && (
          <Button onClick={onUpload} size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Upload Photo
          </Button>
        )}
      </div>

      {photos.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
          No photos uploaded yet
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative group aspect-square rounded-lg overflow-hidden border cursor-pointer"
              onClick={() => setSelectedPhoto(photo)}
            >
              <Image
                src={photo.file_url}
                alt={photo.caption || 'Job photo'}
                fill
                className="object-cover"
              />
              <div className="absolute top-2 left-2">
                <Badge className={`${photoTypeColors[photo.photo_type]} text-white text-xs`}>
                  {photo.photo_type}
                </Badge>
              </div>
              {canEdit && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Delete this photo?')) {
                        onDelete(photo.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {photo.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2 text-xs">
                  {photo.caption}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <Button
            size="sm"
            variant="ghost"
            className="absolute top-4 right-4 text-white"
            onClick={() => setSelectedPhoto(null)}
          >
            <X className="h-6 w-6" />
          </Button>
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full">
            <Image
              src={selectedPhoto.file_url}
              alt={selectedPhoto.caption || 'Job photo'}
              fill
              className="object-contain"
            />
          </div>
          {selectedPhoto.caption && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-lg">
              {selectedPhoto.caption}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
