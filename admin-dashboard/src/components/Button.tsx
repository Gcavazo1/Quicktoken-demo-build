import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
// import { cn } from '@/lib/utils'; // Assuming you have a utility for merging class names

// Simple utility to merge class names (replace cn)
const cn = (...classes: (string | undefined | null | false)[]) => {
  return classes.filter(Boolean).join(' ');
}

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90', // Check theme variable mapping
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90', // Check theme variable mapping
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground', // Check theme variable mapping
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80', // Check theme variable mapping
        ghost: 'hover:bg-accent hover:text-accent-foreground', // Check theme variable mapping
        link: 'text-primary underline-offset-4 hover:underline', // Check theme variable mapping
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    // Note: Using cn utility from shadcn/ui assumes it's set up correctly.
    // If not, replace cn with a simple template literal or clsx.
    // Also, Tailwind theme variables (like primary, secondary) must be defined in tailwind.config.js

    // Use the simple cn function defined above
    return (
      <button
        className={cn(buttonVariants({ variant, size }), className)} // Apply base variants and passed className
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };

// Helper function placeholder if cn is not available
// const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');

// Basic Tailwind example without cva/cn if needed:
// const Button: React.FC<ButtonProps> = ({
//   children,
//   onClick,
//   disabled,
//   className = '',
//   // Add other props as needed
// }) => {
//   const baseStyle = 'px-4 py-2 rounded font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
//   // Example theme handling (adapt based on actual theme setup)
//   const themeStyle = 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:ring-blue-500';
//   return (
//     <button
//       onClick={onClick}
//       disabled={disabled}
//       className={`${baseStyle} ${themeStyle} ${className}`}
//     >
//       {children}
//     </button>
//   );
// };
// export { Button }; 