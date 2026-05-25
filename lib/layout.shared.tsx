import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { UserMenu } from '@/components/auth/user-menu';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: 'PVCB TA',
      children: <UserMenu />,
    },
  };
}
