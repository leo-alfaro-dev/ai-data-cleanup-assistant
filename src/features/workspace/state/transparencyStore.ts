import { createGlobalState } from 'react-global-state-hooks';

export const transparencyStore$ = createGlobalState(
  { isOpen: false },
  {
    actions: {
      open() {
        return (store) => store.setState({ isOpen: true });
      },
      close() {
        return (store) => store.setState({ isOpen: false });
      },
    },
  }
);

export const transparencyActions = transparencyStore$.actions;

export const useIsTransparencyOpen = transparencyStore$.createSelectorHook(
  (state) => state.isOpen
);
