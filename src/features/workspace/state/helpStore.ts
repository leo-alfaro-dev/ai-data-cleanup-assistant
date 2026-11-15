import { createGlobalState } from 'react-global-state-hooks';

export const helpStore$ = createGlobalState(
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

export const helpActions = helpStore$.actions;

export const useIsHelpOpen = helpStore$.createSelectorHook(
  (state) => state.isOpen
);
