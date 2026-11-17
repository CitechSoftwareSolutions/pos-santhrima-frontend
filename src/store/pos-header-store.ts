import { create } from "zustand";

interface PosHeaderState {
  isPosActive: boolean;
  terminalName: string | null;
  isRegisterOpen: boolean;
  isProcessing: boolean;
  onOpenRegister: (() => void) | null;
  onCloseRegister: (() => void) | null;
  onSwitchCounter: (() => void) | null;

  setPosActive: (active: boolean) => void;
  updatePosStatus: (data: {
    terminalName: string | null;
    isRegisterOpen: boolean;
    isProcessing: boolean;
    onOpenRegister: () => void;
    onCloseRegister: () => void;
    onSwitchCounter: () => void;
  }) => void;
  clearPosStatus: () => void;
}

export const usePosHeaderStore = create<PosHeaderState>((set) => ({
  isPosActive: false,
  terminalName: null,
  isRegisterOpen: false,
  isProcessing: false,
  onOpenRegister: null,
  onCloseRegister: null,
  onSwitchCounter: null,

  setPosActive: (active) => set({ isPosActive: active }),
  updatePosStatus: (data) =>
    set({
      isPosActive: true,
      terminalName: data.terminalName,
      isRegisterOpen: data.isRegisterOpen,
      isProcessing: data.isProcessing,
      onOpenRegister: data.onOpenRegister,
      onCloseRegister: data.onCloseRegister,
      onSwitchCounter: data.onSwitchCounter,
    }),
  clearPosStatus: () =>
    set({
      isPosActive: false,
      terminalName: null,
      isRegisterOpen: false,
      isProcessing: false,
      onOpenRegister: null,
      onCloseRegister: null,
      onSwitchCounter: null,
    }),
}));
