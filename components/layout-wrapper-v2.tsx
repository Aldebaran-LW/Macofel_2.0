'use client';

import HeaderV2 from './header-v2';
import FooterV2 from './footer-v2';
import WhatsAppButton from './whatsapp-button';

export default function LayoutWrapperV2({ children }: { children: React.ReactNode }) {
  return (
    <>
      <HeaderV2 />
      <main>{children}</main>
      <FooterV2 />
      <WhatsAppButton />
    </>
  );
}
