import React, { forwardRef } from 'react';

export const PageContainer = forwardRef(({ children, className = "" }, ref) => {
  return (
    <main ref={ref} className={`min-h-screen w-full overflow-x-hidden ${className}`}>
      <div className="fd-page">
        {children}
      </div>
    </main>
  );
});

PageContainer.displayName = 'PageContainer';
