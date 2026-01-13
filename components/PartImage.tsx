
import React, { useEffect, useState } from 'react';
import { generatePartImage } from '../services/geminiService.ts';
import { PhotoMode } from '../types.ts';

interface PartImageProps {
  partNo: string;
  description: string;
  photoMode: PhotoMode;
  originalImages?: string[];
}

export const PartImage: React.FC<PartImageProps> = ({ partNo, description, photoMode, originalImages }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    // Reset state when props change
    setImageUrl(null);
    setLoading(false);
    setAttempted(false);
  }, [partNo, description, photoMode, originalImages]);

  useEffect(() => {
    if (attempted) return;

    const processImage = async () => {
      setAttempted(true);
      
      // In EXTRACT mode, prioritize original/extracted images.
      if (photoMode === PhotoMode.EXTRACT && originalImages && originalImages.length > 0) {
        setImageUrl(originalImages[0]);
        return; // Image found, no need to proceed to AI generation.
      }

      // Fallback to AI generation for EXTRACT mode (if no images were found) or for explicit AI mode.
      if (photoMode === PhotoMode.EXTRACT || photoMode === PhotoMode.AI) {
        setLoading(true);
        const url = await generatePartImage(partNo, description);
        setImageUrl(url);
        setLoading(false);
      }
    };
    
    // Using a timeout to stagger API calls for multiple items
    const timer = setTimeout(processImage, Math.random() * 500);
    return () => clearTimeout(timer);

  }, [photoMode, partNo, description, originalImages, attempted]);

  if (loading) {
    return (
      <div className="w-full h-full bg-white flex items-center justify-center">
        <div className="w-4 h-4 border-2 border-slate-200 border-t-yellow-400 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (imageUrl) {
    return (
      <div className="w-full h-full bg-white flex items-center justify-center overflow-hidden">
        <img src={imageUrl} alt={partNo} className="max-w-full max-h-full object-contain" />
      </div>
    );
  }

  // Fallback / Placeholder
  return (
    <div className="w-full h-full bg-slate-50 flex items-center justify-center text-center p-1">
      <span className="text-[9px] font-black text-slate-300 uppercase leading-tight">
        CAT<br/>{partNo.substring(0, 5)}
      </span>
    </div>
  );
};
