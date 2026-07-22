import React from "react";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = "", rows = 4, ...props }, ref) => (
    <textarea ref={ref} rows={rows} className={`fd-field min-h-[112px] resize-y ${className}`} {...props} />
  )
);

Textarea.displayName = "Textarea";

export { Textarea };
export default Textarea;
