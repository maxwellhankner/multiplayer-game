import type { ReactNode } from 'react';

interface PlatformControllerShellProps {
  children: ReactNode;
  className?: string;
}

export default function PlatformControllerShell({ children, className }: PlatformControllerShellProps) {
  return (
    <div className="platform-shell controller">
      <div className={`controller-inner${className ? ` ${className}` : ''}`}>{children}</div>
    </div>
  );
}
