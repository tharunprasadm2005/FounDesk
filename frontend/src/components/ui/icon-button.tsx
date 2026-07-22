import React from "react";
import { Button, type ButtonProps } from "./button";

export interface IconButtonProps extends Omit<ButtonProps, "size" | "children"> {
  icon: React.ReactNode;
  label: string;
}

export function IconButton({ icon, label, ariaLabel, ...props }: IconButtonProps) {
  return (
    <Button size="icon" ariaLabel={ariaLabel || label} title={label} {...props}>
      {icon}
    </Button>
  );
}

export default IconButton;
