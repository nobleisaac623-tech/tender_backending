import type { ReactNode } from 'react';

interface CategoryBadgeProps {
  category_name: string;
  category_color?: string;
  className?: string;
  children?: ReactNode;
}

export function CategoryBadge({ category_name, category_color = '#1e3a5f', className = '' }: CategoryBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white ${className}`}
      style={{ backgroundColor: category_color }}
    >
      {category_name}
    </span>
  );
}
