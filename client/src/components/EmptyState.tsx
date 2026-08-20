import { Button } from "@/components/ui/button";
import { ReactNode } from "react";

export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.018] px-6 py-10 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-400/10 text-violet-300">{icon}</div>
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="mt-1 max-w-sm text-sm leading-6 text-slate-400">{description}</p>
      {action && <Button onClick={action.onClick} className="mt-5 rounded-xl bg-violet-500 px-4 text-white hover:bg-violet-400">{action.label}</Button>}
    </div>
  );
}
