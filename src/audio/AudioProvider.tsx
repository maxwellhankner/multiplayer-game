import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  getLobbyMusicId,
  isAudioUnlocked,
  isSfxMuted,
  playSound,
  setLobbyMusicId as setEngineLobbyMusicId,
  setSfxMuted,
  unlockAudio,
} from './engine';
import type { SoundId } from './catalog';
import type { LobbyMusicId } from './lobby-music';

interface AudioContextValue {
  muted: boolean;
  unlocked: boolean;
  lobbyMusicId: LobbyMusicId;
  setMuted: (muted: boolean) => void;
  setLobbyMusicId: (id: LobbyMusicId) => void;
  unlock: () => Promise<void>;
  play: (id: SoundId) => void;
}

const AudioCtx = createContext<AudioContextValue | null>(null);

export function AudioProvider({ children }: { children: ReactNode }) {
  const [muted, setMutedState] = useState(isSfxMuted);
  const [unlocked, setUnlocked] = useState(isAudioUnlocked);
  const [lobbyMusicId, setLobbyMusicIdState] = useState(getLobbyMusicId);

  const unlock = useCallback(async () => {
    await unlockAudio();
    setUnlocked(true);
  }, []);

  const setMuted = useCallback((value: boolean) => {
    setSfxMuted(value);
    setMutedState(value);
  }, []);

  const play = useCallback((id: SoundId) => {
    playSound(id);
  }, []);

  const setLobbyMusicId = useCallback((id: LobbyMusicId) => {
    setEngineLobbyMusicId(id);
    setLobbyMusicIdState(id);
  }, []);

  useEffect(() => {
    const onPointerDown = () => {
      void unlock();
    };
    window.addEventListener('pointerdown', onPointerDown, { once: true, passive: true });
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [unlock]);

  const value = useMemo(
    () => ({ muted, unlocked, lobbyMusicId, setMuted, setLobbyMusicId, unlock, play }),
    [muted, unlocked, lobbyMusicId, setMuted, setLobbyMusicId, unlock, play],
  );

  return <AudioCtx.Provider value={value}>{children}</AudioCtx.Provider>;
}

export function useAudio(): AudioContextValue {
  const value = useContext(AudioCtx);
  if (!value) {
    throw new Error('useAudio must be used within AudioProvider');
  }
  return value;
}
