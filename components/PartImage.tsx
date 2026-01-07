
import React, { useEffect, useState } from 'react';
import { generatePartImage } from '../services/geminiService.ts';

interface PartImageProps {
  partNo: string;
  description: string;
  enableAI: boolean;
  originalImages?: string[]; // Updated to accept array
}

export const PartImage: React.FC<PartImageProps> = ({ partNo, description, enableAI, originalImages }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [attempted, setAttempted] = useState(false);

  // Check for original images from PDF first
  useEffect(() => {
    if (originalImages && originalImages.length > 0) {
        setImageUrl(originalImages[0]);
        return;
    }
    
    // Fallback to AI if enabled and no original image
    if (enableAI && !attempted && !imageUrl && (!originalImages || originalImages.length === 0)) {
      const fetchImage = async () => {
        setLoading(true);
        const url = await generatePartImage(partNo, description);
        setImageUrl(url);
        setLoading(false);
        setAttempted(true);
      };
      
      const timer = setTimeout(fetchImage, Math.random() * 1000);
      return () => clearTimeout(timer);
    }
  }, [enableAI, partNo, description, attempted, imageUrl, originalImages]);

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
