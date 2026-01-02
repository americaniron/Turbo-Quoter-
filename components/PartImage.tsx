import React, { useEffect, useState } from 'react';
import { generatePartImage } from '../services/geminiService.ts';

interface PartImageProps {
  partNo: string;
  description: string;
  enableAI: boolean;
}

export const PartImage: React.FC<PartImageProps> = ({ partNo, description, enableAI }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (enableAI && !attempted && !imageUrl) {
      const fetchImage = async () => {
        setLoading(true);
        const url = await generatePartImage(partNo, description);
        setImageUrl(url);
        setLoading(false);
        setAttempted(true);
      };
      
      // Small stagger to prevent browser request flooding if many items
      const timer = setTimeout(fetchImage, Math.random() * 1000);
      return () => clearTimeout(timer);
    }
  }, [enableAI, partNo, description, attempted, imageUrl]);

  if (loading) {
    return (
      <div className="w-[100px] h-[100px] bg-white border border-slate-200 rounded-md flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-slate-200 border-t-yellow-400 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (imageUrl) {
    return (
      <div className="w-[100px] h-[100px] bg-white border border-slate-200 rounded-md overflow-hidden flex items-center justify-center p-1">
        <img src={imageUrl} alt={partNo} className="w-full h-full object-contain" />
      </div>
    );
  }

  // Fallback / Placeholder
  return (
    <div className="w-[100px] h-[100px] bg-slate-50 border border-slate-200 rounded-md flex items-center justify-center text-center p-1">
      <span className="text-[10px] font-black text-slate-300 uppercase leading-tight">
        CAT<br/>{partNo.substring(0, 5)}
      </span>
    </div>
  );
};