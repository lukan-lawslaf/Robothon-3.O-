import React from 'react';

export interface SwipeAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  color?: string;
  dismiss?: boolean;
  onSelect?: () => void;
}

export interface SwipeRowProps {
  children?: React.ReactNode;
  actions?: SwipeAction[];
  onAction?: (action: SwipeAction) => void;
  onCommit?: (action: SwipeAction) => void;
  actionColor?: string;
  drawerColor?: string;
  rowColor?: string;
  textColor?: string;
  height?: number;
  radius?: number;
  actionWidth?: number;
  direction?: 'left' | 'right';
  snapBounce?: number;
  resistance?: number;
  collapseMs?: number;
  commitAt?: number;
  fullSwipe?: boolean;
  style?: React.CSSProperties;
  className?: string;
  disabled?: boolean;
}

declare const SwipeRow: React.FC<SwipeRowProps>;
export default SwipeRow;
