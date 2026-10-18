import React from 'react';

export interface SpringCheckProps {
  label?: React.ReactNode;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  color?: string;
  fillColor?: string;
  checkColor?: string;
  boxSize?: number;
  boxRadius?: number;
  fontSize?: number;
  bounce?: number;
  strikeLag?: number;
  doneOpacity?: number;
  strike?: 'left' | 'center' | 'right' | 'none';
  className?: string;
}

declare const SpringCheck: React.FC<SpringCheckProps>;
export default SpringCheck;
