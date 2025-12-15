'use client';

import React from 'react';

interface Button3DProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'success' | 'danger' | 'warning' | 'secondary';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  iconOnly?: boolean;
  children: React.ReactNode;
}

export function Button3D({
  variant = 'default',
  size = 'md',
  fullWidth = false,
  iconOnly = false,
  className = '',
  children,
  ...props
}: Button3DProps) {
  const variantClass = variant !== 'default' ? `btn-3d-${variant}` : '';
  const sizeClass = size !== 'md' ? `btn-3d-${size}` : '';
  const widthClass = fullWidth ? 'btn-3d-full' : '';
  const iconClass = iconOnly ? 'btn-3d-icon' : '';

  return (
    <button
      className={`btn-3d ${variantClass} ${sizeClass} ${widthClass} ${iconClass} ${className}`.trim()}
      {...props}
    >
      <span className="btn-3d-inner">
        {children}
      </span>
    </button>
  );
}

export default Button3D;

