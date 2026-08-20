import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type FinanceView = "individual" | "together";

type FinanceContextValue = {
  view: FinanceView;
  setView: (view: FinanceView) => void;
  isTogether: boolean;
};

const FinanceContext = createContext<FinanceContextValue | undefined>(undefined);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [view, setViewState] = useState<FinanceView>("individual");

  const setView = (nextView: FinanceView) => {
    setViewState(nextView);
  };

  useEffect(() => {
    document.documentElement.dataset.financeView = view;
  }, [view]);

  const value = useMemo(() => ({ view, setView, isTogether: view === "together" }), [view]);
  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinanceContext() {
  const context = useContext(FinanceContext);
  if (!context) throw new Error("useFinanceContext deve ser usado dentro de FinanceProvider");
  return context;
}
