import { EmptyState } from "@/components/EmptyState";
import { SectionHeader } from "@/components/SectionHeader";
import { TransactionDialog } from "@/components/TransactionDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useFinanceContext } from "@/contexts/FinanceContext";
import { formatCurrency, formatDate } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { ArrowDownLeft, ArrowUpRight, Filter, Pencil, Plus, ReceiptText, Search, Tags, Trash2 } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";

export default function Transactions() {
  const { view, isTogether } = useFinanceContext();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");
  const transactions = trpc.finance.transactions.list.useQuery({ context: view });
  const utils = trpc.useUtils();
  const remove = trpc.finance.transactions.delete.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.finance.transactions.list.invalidate(), utils.finance.dashboard.invalidate(), utils.finance.reports.invalidate(), utils.finance.accounts.list.invalidate(), utils.finance.budgets.list.invalidate()]);
      toast.success("Transação removida.");
    },
  });
  const filtered = useMemo(() => (transactions.data ?? []).filter(transaction => {
    const matchesSearch = `${transaction.transaction.description} ${transaction.category?.name ?? ""} ${transaction.account?.name ?? ""}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (typeFilter === "all" || transaction.transaction.type === typeFilter);
  }), [transactions.data, search, typeFilter]);

  if (transactions.error) return <EmptyState icon={<ReceiptText className="h-5 w-5" />} title="A visão compartilhada está aguardando o segundo perfil" description={transactions.error.message} />;
  return <div>
    <SectionHeader eyebrow={isTogether ? "NÓS DOIS" : "LANÇAMENTOS"} title="Transações" description={isTogether ? "Histórico consolidado, com identificação de quem registrou cada movimento." : "Registre, edite e organize cada movimento da sua vida financeira."} action={!isTogether ? <div className="flex gap-2"><TagDialog /><TransactionDialog /></div> : undefined} />
    <div className="atlas-panel overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-white/[0.07] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"><div className="relative max-w-md flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" /><input value={search} onChange={event => setSearch(event.target.value)} className="atlas-input pl-9" placeholder="Buscar por descrição, categoria ou conta" /></div><div className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.025] p-1"><Filter className="ml-2 h-3.5 w-3.5 text-slate-600" />{(["all", "income", "expense"] as const).map(value => <button key={value} onClick={() => setTypeFilter(value)} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${typeFilter === value ? "bg-white/[0.1] text-white" : "text-slate-500 hover:text-slate-300"}`}>{value === "all" ? "Todas" : value === "income" ? "Receitas" : "Despesas"}</button>)}</div></div>
      {transactions.isLoading ? <div className="space-y-3 p-5">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-14 animate-pulse rounded-xl bg-white/[0.04]" />)}</div> : filtered.length ? <div className="divide-y divide-white/[0.055]">{filtered.map(transaction => <div key={transaction.transaction.id} className="group flex items-center gap-3 px-4 py-4 transition hover:bg-white/[0.022] sm:gap-4 sm:px-6"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${transaction.transaction.type === "income" ? "bg-emerald-400/10 text-emerald-300" : "bg-rose-400/10 text-rose-300"}`}>{transaction.transaction.type === "income" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-200">{transaction.transaction.description}</p><p className="mt-1 truncate text-xs text-slate-500">{transaction.category?.name ?? "Sem categoria"} <span className="px-1 text-slate-700">·</span> {transaction.account.name} <span className="px-1 text-slate-700">·</span> {formatDate(transaction.transaction.occurredAt)}{isTogether && transaction.owner.name ? <><span className="px-1 text-slate-700">·</span>{transaction.owner.name}</> : null}</p></div><p className={`hidden text-sm font-semibold sm:block ${transaction.transaction.type === "income" ? "text-emerald-300" : "text-white"}`}>{transaction.transaction.type === "income" ? "+" : "−"}{formatCurrency(transaction.transaction.amountCents)}</p><div className="flex items-center gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">{!isTogether && <TransactionDialog transaction={transaction.transaction} trigger={<Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:bg-white/5 hover:text-white"><Pencil className="h-3.5 w-3.5" /></Button>} />}{!isTogether && <Button disabled={remove.isPending} onClick={() => { if (window.confirm("Remover esta transação?")) remove.mutate({ id: transaction.transaction.id }); }} variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:bg-rose-400/10 hover:text-rose-300"><Trash2 className="h-3.5 w-3.5" /></Button>}</div><p className={`text-right text-sm font-semibold sm:hidden ${transaction.transaction.type === "income" ? "text-emerald-300" : "text-white"}`}>{transaction.transaction.type === "income" ? "+" : "−"}{formatCurrency(transaction.transaction.amountCents)}</p></div>)}</div> : <div className="p-6"><EmptyState icon={<ReceiptText className="h-5 w-5" />} title={search || typeFilter !== "all" ? "Nenhum resultado encontrado" : "Seu extrato está vazio"} description={search || typeFilter !== "all" ? "Ajuste seus filtros e tente novamente." : isTogether ? "Quando o espaço for vinculado, os lançamentos dos dois perfis aparecerão aqui." : "Registre sua primeira movimentação para começar seu histórico."} action={!isTogether && !search && typeFilter === "all" ? { label: "Nova transação", onClick: () => document.getElementById("transaction-trigger")?.click() } : undefined} /></div>}
    </div>
  </div>;
}

function TagDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const utils = trpc.useUtils();
  const tags = trpc.finance.tags.list.useQuery();
  const create = trpc.finance.tags.create.useMutation({ onSuccess: async () => { await utils.finance.tags.list.invalidate(); setName(""); toast.success("Etiqueta adicionada."); } });
  const submit = (event: FormEvent) => { event.preventDefault(); if (name.trim()) create.mutate({ name: name.trim() }); };
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button variant="outline" className="h-10 rounded-xl border-white/10 bg-white/[0.025] text-slate-300 hover:bg-white/[0.07] hover:text-white"><Tags className="mr-2 h-4 w-4" />Etiquetas</Button></DialogTrigger><DialogContent className="border-white/10 bg-[#151620] text-slate-100 sm:max-w-sm"><DialogHeader><DialogTitle>Etiquetas</DialogTitle></DialogHeader><form onSubmit={submit} className="mt-2 flex gap-2"><input value={name} onChange={event => setName(event.target.value)} className="atlas-input" placeholder="Ex.: Trabalho" /><Button disabled={create.isPending} type="submit" className="rounded-xl bg-violet-500 text-white hover:bg-violet-400"><Plus className="h-4 w-4" /></Button></form><div className="mt-4 flex flex-wrap gap-2">{tags.data?.length ? tags.data.map(tag => <span key={tag.id} className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-xs text-slate-300"><span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full" style={{ background: tag.color }} />{tag.name}</span>) : <p className="text-sm text-slate-500">Crie etiquetas para deixar seu histórico ainda mais claro.</p>}</div></DialogContent></Dialog>;
}
