import React from 'react';

const logoUrl = '/logo.png';

interface BrandLogoProps {
  variant?: 'full' | 'icon-only' | 'header' | 'login';
  className?: string;
  iconSize?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export function BrandLogo({
  variant = 'icon-only',
  className = '',
  iconSize,
  size,
}: BrandLogoProps) {

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20',
    '2xl': 'w-28 h-28'
  };

  const selectedSize = sizeClasses[iconSize || size || 'md'];

  const logoIcon = (
    <img
      src={logoUrl}
      alt="Pau Brasil Distribuidora Ambev"
      className={`${selectedSize} shrink-0 object-contain`}
    />
  );

  if (variant === 'icon-only') {
    return logoIcon;
  }

  if (variant === 'login') {
    return (
      <div className={`flex flex-col items-center text-center ${className}`} id="brand_logo_login">
        <div className="bg-white p-2.5 rounded-2xl shadow-lg border border-slate-100 mb-4 hover:scale-105 transition-transform duration-300">
          {logoIcon}
        </div>
        <div className="font-sans leading-none flex flex-col items-center">
          <span className="text-3xl font-light tracking-wide text-slate-800">
            PAU <span className="font-black text-[#1e5bf2]">BRASIL</span>
          </span>
          <span className="text-[10px] uppercase font-bold tracking-[0.25em] text-[#1e5bf2]/80 mt-2 block leading-none">
            distribuidora <span className="text-amber-500 font-extrabold">ambev</span>
          </span>
        </div>
      </div>
    );
  }

  if (variant === 'header') {
    return (
      <div className={`flex items-center space-x-3 ${className}`} id="brand_logo_header">
        <img
          src={logoUrl}
          alt="Pau Brasil"
          className="w-9 h-9 object-contain"
        />
        <div className="leading-tight">
          <span className="font-sans font-light text-sm sm:text-base tracking-wide block text-white uppercase">
            PAU <span className="font-black text-amber-400">BRASIL</span>
          </span>
          <span className="font-mono text-[9px] sm:text-[10px] tracking-[0.2em] text-slate-300 uppercase block leading-none">
            distribuidora <span className="text-amber-400 font-extrabold">ambev</span>
          </span>
        </div>
      </div>
    );
  }

  // Default 'full' variant (horizontal logo)
  return (
    <div className={`flex items-center space-x-4 ${className}`} id="brand_logo_full">
      {logoIcon}
      <div className="leading-tight">
        <span className="font-sans font-light text-2xl tracking-wide block text-slate-800">
          PAU <span className="font-black text-[#1e5bf2]">BRASIL</span>
        </span>
        <span className="font-sans text-[10px] uppercase font-bold tracking-[0.25em] text-[#1e5bf2]/80 mt-1 block leading-none">
          distribuidora <span className="text-amber-500 font-extrabold">ambev</span>
        </span>
      </div>
    </div>
  );
}

export default BrandLogo;
