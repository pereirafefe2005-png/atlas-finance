import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useFinanceContext } from "@/contexts/FinanceContext";
import { currentMonthKey, toCents } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { Paperclip, Plus, ReceiptText, X } from "lucide-react";
import { ChangeEvent, FormEvent, useState } from "react";
import { toast } from "sonner";

type EditableTransaction = {
  id: number;
  accountId: number;
  categoryId: number | null;
  type: "income" | "expense";
  amountCents: number;
  description: string;
  notes: string | null;
  occurredAt: Date;
  attachmentKey?: string | null;
  attachmentUrl?: string | null;
};

export function TransactionDialog({ transaction, trigger }: { transaction?: EditableTransaction; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { view } = useFinanceContext();
  const utils = trpc.useUtils();
  const accounts = trpc.finance.accounts.list.useQuery({ context: "individual" });
  const categories = trpc.finance.categories.list.useQuery({ context: "individual" });
  const tags = trpc.finance.tags.list.useQuery();
  const [type, setType] = useState<"income" | "expense">(() => transaction?.type ?? "expense");
  const [attachment, setAttachment] = useState<{ key: string; url: string; name: string } | null>(() => transaction?.attachmentKey && transaction?.attachmentUrl ? { key: transaction.attachmentKey, url: transaction.attachmentUrl, name: "Anexo atual" } : null);
  const upload = trpc.finance.attachment.upload.useMutation();
  const create = trpc.finance.transactions.create.useMutation({ onSuccess: async () => { await Promise.all([utils.finance.transactions.list.invalidate(), utils.finance.dashboard.invalidate(), utils.finance.reports.invalidate(), utils.finance.accounts.list.invalidate(), utils.finance.budgets.list.invalidate()]); toast.success("Transação registrada."); setOpen(false); } });
  const update = trpc.finance.transactions.update.useMutation({ onSuccess: async () => { await Promise.all([utils.finance.transactions.list.invalidate(), utils.finance.dashboard.invalidate(), utils.finance.reports.invalidate(), utils.finance.accounts.list.invalidate(), utils.finance.budgets.list.invalidate()]); toast.success("Transação atualizada."); setOpen(false); } });

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type) || file.size > 5_000_000) { toast.error("Use PNG, JPG, WEBP ou PDF de até 5 MB."); return; }
    const encoded = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",")[1] ?? ""); reader.onerror = reject; reader.readAsDataURL(file); });
    try { const stored = await upload.mutateAsync({ fileName: file.name, mimeType: file.type as "image/jpeg" | "image/png" | "image/webp" | "application/pdf", base64: encoded }); setAttachment({ ...stored, name: file.name }); toast.success("Anexo preparado."); } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível anexar o arquivo."); }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const accountId = Number(form.get("accountId"));
    if (!accountId) { toast.error("Selecione uma conta."); return; }
    const data = { accountId, categoryId: form.get("categoryId") === "none" ? null : Number(form.get("categoryId")), type, amountCents: toCents(String(form.get("amount"))), description: String(form.get("description") || "").trim(), notes: String(form.get("notes") || "").trim() || undefined, occurredAt: new Date(`${String(form.get("occurredAt"))}T12:00:00`), tagIds: Array.from(form.getAll("tagIds")).map(Number).filter(Boolean), attachmentKey: attachment?.key, attachmentUrl: attachment?.url };
    if (!data.amountCents || !data.description) { toast.error("Preencha uma descrição e um valor válido."); return; }
    if (transaction) update.mutate({ id: transaction.id, ...data }); else create.mutate(data);
  };
  const isSaving = create.isPending || update.isPending || upload.isPending;
  const dateValue = transaction ? new Date(transaction.occurredAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  const personalCategories = (categories.data ?? []).filter(category => category.kind === type);

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild>{trigger ?? <Button className="h-10 rounded-xl bg-violet-500 px-4 text-white hover:bg-violet-400"><Plus className="mr-2 h-4 w-4" />Nova transação</Button>}</DialogTrigger>
    <DialogContent className="max-h-[92vh] overflow-y-auto border-white/10 bg-[#151620] p-0 text-slate-100 sm:max-w-2xl">
      <DialogHeader className="border-b border-white/[0.07] p-6 pb-5"><DialogTitle className="text-xl tracking-[-0.03em]">{transaction ? "Editar transação" : "Registrar transação"}</DialogTitle><DialogDescription className="text-slate-400">{view === "together" ? "O lançamento será registrado apenas no seu perfil individual." : "Registre uma movimentação e mantenha sua visão atualizada."}</DialogDescription></DialogHeader>
      {!accounts.data?.length ? <div className="p-6"><p className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">Crie uma conta antes de registrar uma transação.</p></div> : <form onSubmit={submit} className="space-y-5 p-6">
        <div className="grid grid-cols-2 rounded-xl border border-white/[0.08] bg-white/[0.025] p-1"><button type="button" onClick={() => setType("expense")} className={`rounded-lg py-2 text-sm font-medium transition ${type === "expense" ? "bg-rose-400/15 text-rose-200" : "text-slate-500"}`}>Despesa</button><button type="button" onClick={() => setType("income")} className={`rounded-lg py-2 text-sm font-medium transition ${type === "income" ? "bg-emerald-400/15 text-emerald-200" : "text-slate-500"}`}>Receita</button></div>
        <div className="grid gap-4 sm:grid-cols-[1.3fr_.7fr]"><label className="grid gap-2 text-xs font-medium text-slate-300">Descrição<input name="description" defaultValue={transaction?.description} className="atlas-input" placeholder={type === "expense" ? "Ex.: Mercado da semana" : "Ex.: Salário mensal"} required /></label><label className="grid gap-2 text-xs font-medium text-slate-300">Valor<input name="amount" defaultValue={transaction ? (transaction.amountCents / 100).toFixed(2).replace(".", ",") : ""} inputMode="decimal" className="atlas-input" placeholder="0,00" required /></label></div>
        <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-xs font-medium text-slate-300">Conta<select name="accountId" defaultValue={transaction?.accountId} className="atlas-input appearance-none">{accounts.data.map(account => <option className="bg-[#151620]" value={account.id} key={account.id}>{account.name}</option>)}</select></label><label className="grid gap-2 text-xs font-medium text-slate-300">Categoria<select name="categoryId" defaultValue={transaction?.categoryId ?? "none"} className="atlas-input appearance-none"><option className="bg-[#151620]" value="none">Sem categoria</option>{personalCategories.map(category => <option className="bg-[#151620]" value={category.id} key={category.id}>{category.name}</option>)}</select></label></div>
        <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-xs font-medium text-slate-300">Data<input name="occurredAt" type="date" defaultValue={dateValue} className="atlas-input [color-scheme:dark]" required /></label><label className="grid gap-2 text-xs font-medium text-slate-300">Etiquetas<div className="flex min-h-10 flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-white/[0.1] bg-white/[0.035] px-3">{tags.data?.length ? tags.data.map(tag => <label key={tag.id} className="flex items-center gap-1.5 text-xs text-slate-400"><input name="tagIds" type="checkbox" value={tag.id} className="accent-violet-500" />{tag.name}</label>) : <span className="text-xs text-slate-600">Nenhuma etiqueta criada.</span>}</div></label></div>
        <label className="grid gap-2 text-xs font-medium text-slate-300">Observação<textarea name="notes" defaultValue={transaction?.notes ?? ""} className="min-h-20 w-full resize-none rounded-xl border border-white/[0.1] bg-white/[0.035] p-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-400/70 focus:ring-2 focus:ring-violet-400/15" placeholder="Um contexto que você queira lembrar." /></label>
        <div className="flex flex-wrap items-center gap-3"><label className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.035] px-3 text-xs font-medium text-slate-300 transition hover:bg-white/[0.07]"><Paperclip className="h-3.5 w-3.5" />{upload.isPending ? "Enviando..." : "Adicionar anexo"}<input onChange={onFile} type="file" accept="image/png,image/jpeg,image/webp,application/pdf" className="hidden" /></label>{attachment && <span className="inline-flex items-center gap-2 rounded-lg bg-violet-500/10 px-3 py-2 text-xs text-violet-200"><ReceiptText className="h-3.5 w-3.5" />{attachment.name}<button type="button" onClick={() => setAttachment(null)}><X className="h-3.5 w-3.5" /></button></span>}</div>
        {(create.error || update.error) && <p className="text-sm text-rose-300">{create.error?.message ?? update.error?.message}</p>}
        <div className="flex justify-end gap-3 border-t border-white/[0.07] pt-5"><Button type="button" variant="ghost" onClick={() => setOpen(false)} className="text-slate-400 hover:bg-white/5 hover:text-white">Cancelar</Button><Button disabled={isSaving} type="submit" className="rounded-xl bg-violet-500 px-5 text-white hover:bg-violet-400">{isSaving ? "Salvando..." : transaction ? "Salvar alterações" : "Registrar"}</Button></div>
      </form>}
    </DialogContent>
  </Dialog>;
}
