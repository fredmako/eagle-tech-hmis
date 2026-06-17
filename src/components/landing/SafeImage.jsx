import { useState } from 'react';

const FALLBACK = 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&auto=format&fit=crop&q=60';

export function SafeImage({ src, alt, className, ...rest }) {
  const [current, setCurrent] = useState(src);
  return (
    <img
      src={current}
      alt={alt}
      className={className}
      onError={() => setCurrent(FALLBACK)}
      {...rest}
    />
  );
}
