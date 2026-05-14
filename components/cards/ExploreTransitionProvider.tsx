"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

interface ExploreTransitionCtx {
  navigate: (url: string) => void;
  isPending: boolean;
}

const ExploreTransitionContext = React.createContext<ExploreTransitionCtx>({
  navigate: () => {},
  isPending: false,
});

export function ExploreTransitionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  const navigate = React.useCallback(
    (url: string) => {
      startTransition(() => {
        router.replace(url, { scroll: false });
      });
    },
    [router],
  );

  return (
    <ExploreTransitionContext.Provider value={{ navigate, isPending }}>
      {children}
    </ExploreTransitionContext.Provider>
  );
}

export function useExploreNavigation() {
  return React.useContext(ExploreTransitionContext);
}
