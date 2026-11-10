import { useSoundContext } from '../context/SoundContext';

/**
 * useSound hook — consumes the global SoundContext
 */
export function useSound() {
  return useSoundContext();
}

export default useSound;
