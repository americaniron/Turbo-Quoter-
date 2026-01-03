import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <img 
      src="/logo.png" 
      alt="American Iron Logo" 
      className={`object-contain ${className}`}
    />
  );
};