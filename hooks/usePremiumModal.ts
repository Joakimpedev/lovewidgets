/**
 * Hook to manage Premium Unlock Modal
 * Easy way to show premium modal from anywhere in the app
 */

import { useState } from 'react';

export function usePremiumModal() {
  const [isVisible, setIsVisible] = useState(false);

  const show = () => setIsVisible(true);
  const hide = () => setIsVisible(false);

  return {
    isVisible,
    show,
    hide,
  };
}

