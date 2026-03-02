'use client';

import HeaderDecar from './header-decar';
import FooterV2 from './footer-v2';
import WhatsAppButton from './whatsapp-button';

export default function LayoutWrapperDecar({ children }: { children: React.ReactNode }) {
  return (
    <>
      <HeaderDecar />
      <main>{children}</main>
      <FooterV2 />
      <WhatsAppButton />
    </>
  );
}
