'use client';

import HeaderDemo from './header-demo';
import FooterDemo from './footer-demo';

export default function ClientLayoutWrapperDemo({ children }: { children: React.ReactNode }) {
  return (
    <>
      <HeaderDemo />
      {children}
      <FooterDemo />
    </>
  );
}
