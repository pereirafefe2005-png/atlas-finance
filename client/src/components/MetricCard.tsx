import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { ReactNode } from "react";

export function MetricCard({ label, valueCents, detail, trend, icon, accent = "violet" }: { label: string; valueCents: number; detail: string; trend?: number; icon: ReactNode; accent?: "violet" | "emerald" | "rose" | "sky" }) {
  const tone = {
    violet: "from-violet-500/20 to-fuchsia-500/5 text-violet-300",
    emerald: "from-emerald-500/20 to-teal-500/5 text-emerald-300",
    rose: "from-rose-500/20 to-orange-500/5 text-rose-300",
    sky: "from-sky-500/20 to-indigo-500/5 text-sky-300",
  }[accent];
  const positive = (trend ?? 0) > 0;
  const negative = (trend ?? 0) < 0;
  return (
    <section className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#12131b]/95 p-5 shadow-[0_18px_48px_rgba(0,0,0,0.16)] transition duration-200 hover:-translate-y-0.5 hover:border-white/[0.12]">
      <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${tone.split(" ")[0]} ${tone.split(" ")[1]}`} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">{label}</p>
          <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white sm:text-[1.7rem]">{formatCurrency(valueCents)}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${tone}`}>{icon}</div>
      </div>
      <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
        {trend !== undefined && (
          <span className={`inline-flex items-center gap-0.5 font-medium ${positive ? "text-emerald-300" : negative ? "text-rose-300" : "text-slate-400"}`}>
            {positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : negative ? <ArrowDownRight className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
            {Math.abs(trend).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
          </span>
        )}
        <span>{detail}</span>
      </div>
    </section>
  );
}
