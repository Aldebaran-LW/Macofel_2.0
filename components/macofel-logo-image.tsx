'use client';

import Image from 'next/image';
import { useCallback, useState } from 'react';

/** Ordem: raiz do `public`, cópia em `loja/`, JPEG de reserva. */
const LOGO_SRCS = ['/logo-macofel.png', '/loja/logo-macofel.png', '/Macofel.jpg'] as const;

export type MacofelLogoImageProps = {
  alt?: string;
  className?: string;
  priority?: boolean;
} & (
  | { width: number; height: number; fill?: false; sizes?: never }
  | { fill: true; sizes: string; width?: never; height?: never }
);

export default function MacofelLogoImage(props: MacofelLogoImageProps) {
  const [srcIndex, setSrcIndex] = useState(0);
  const src = LOGO_SRCS[Math.min(srcIndex, LOGO_SRCS.length - 1)];
  const alt = props.alt ?? 'MACOFEL';

  const onError = useCallback(() => {
    setSrcIndex((i) => (i + 1 < LOGO_SRCS.length ? i + 1 : i));
  }, []);

  if ('fill' in props && props.fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={props.sizes}
        className={props.className}
        priority={props.priority}
        onError={onError}
      />
    );
  }

  const { width, height, className, priority } = props;
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
      onError={onError}
    />
  );
}
