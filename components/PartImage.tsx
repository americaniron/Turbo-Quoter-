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
    // Reset state when core props change
    setImageUrl(null);
    setLoading(false);
    setAttempted(false);
  }, [partNo]);

  useEffect(() => {
    if (attempted || photoMode === PhotoMode.NONE) return;

    const processImage = async () => {
      setAttempted(true);
      
      // 1. Mandatory Priority: Use extracted PDF images if present
      if (originalImages && originalImages.length > 0) {
        setImageUrl(originalImages[0]);
        return; 
      }

      // 2. Fallback: Only invoke AI generation if no PDF image exists and mode allows
      if (photoMode === PhotoMode.AI) {
        setLoading(true);
        try {
          const url = await generatePartImage(partNo, description);
          setImageUrl(url);
        } catch (e) {
          console.error("AI Generation failed for part", partNo);
        } finally {
          setLoading(false);
        }
      }
    };
    
    // Slight staggered delay for UI smoothness in long lists
    const timer = setTimeout(processImage, Math.random() * 300);
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
        <img 
          src={imageUrl} 
          alt={`Part ${partNo}`} 
          className="max-w-full max-h-full object-contain" 
        />
      </div>
    );
  }

  // Final branding fallback
  return (
    <div className="w-full h-full bg-slate-50 flex items-center justify-center text-center p-1 border border-slate-100 rounded">
      <span className="text-[9px] font-black text-slate-300 uppercase leading-tight">
        IRON<br/>{partNo.substring(0, 5)}
      </span>
    </div>
  );
};
