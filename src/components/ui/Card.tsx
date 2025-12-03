import React from 'react';
interface CardProps {
  children: React.ReactNode;
  className?: string;
}
export const Card: React.FC<CardProps> = ({
  children,
  className = ''
}) => {
  return <div className={`bg-white rounded-lg border border-[#E5E7EB] shadow-sm ${className}`}>
      {children}
    </div>;
};