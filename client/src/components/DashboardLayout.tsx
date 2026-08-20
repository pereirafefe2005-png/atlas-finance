import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FinanceProvider, useFinanceContext } from "@/contexts/FinanceContext";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { BarChart3, Bell, BriefcaseBusiness, ChevronDown, CircleHelp, Download, Goal, Landmark, LayoutDashboard, LogOut, Menu, ReceiptText, Settings, ShieldCheck, Sparkles, UsersRound, WalletCards, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const navigation = [
  { icon: LayoutDashboard, label: "Visão geral", path: "/" },
  { icon: ReceiptText, label: "Transações", path: "/transacoes" },
  { icon: WalletCards, label: "Contas", path: "/contas" },
  { icon: BriefcaseBusiness, label: "Orçamento", path: "/orcamento" },
  { icon: Goal, label: "Metas", path: "/metas" },
  { icon: BarChart3, label: "Relatórios", path: "/relatorios" },
];

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAuth();

  if (loading) return <div className="grid min-h-screen place-items-center bg-[#090a0f]"><div className="h-9 w-9 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" /></div>;
  if (!user) return <SignInScreen />;
  return <FinanceProvider><AtlasShell>{children}</AtlasShell></FinanceProvider>;
}

function SignInScreen() {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#090a0f] px-5 text-white">
      <div className="absolute -left-36 top-0 h-96 w-96 rounded-full bg-violet-600/20 blur-[130px]" />
      <div className="absolute -right-36 bottom-0 h-96 w-96 rounded-full bg-indigo-500/15 blur-[130px]" />
      <section className="relative w-full max-w-md rounded-[2rem] border border-white/10 bg-[#12131b]/90 p-8 shadow-2xl backdrop-blur-xl sm:p-10">
        <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400 to-indigo-600 shadow-lg shadow-violet-900/40"><Landmark className="h-6 w-6" /></div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Atlas Finance</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em]">Clareza para cada decisão.</h1>
        <p className="mt-4 text-sm leading-6 text-slate-400">Entre para organizar suas finanças individuais e, quando quiser, construir uma visão compartilhada a dois.</p>
        <Button onClick={() => startLogin()} className="mt-8 h-12 w-full rounded-xl bg-violet-500 text-sm font-semibold text-white shadow-lg shadow-violet-950/40 hover:bg-violet-400">Entrar com segurança</Button>
        <p className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-500"><ShieldCheck className="h-3.5 w-3.5" /> Seus dados permanecem isolados por perfil.</p>
      </section>
    </main>
  );
}

function AtlasShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { view, setView, isTogether } = useFinanceContext();
  const [location, setLocation] = useLocation();
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const bootstrap = trpc.finance.bootstrap.useMutation();
  const household = trpc.finance.household.status.useQuery();

  useEffect(() => { if (!bootstrap.isSuccess && !bootstrap.isPending) bootstrap.mutate(); }, [bootstrap]);
  useEffect(() => {
    const handler = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPrompt); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const chooseView = (next: "individual" | "together") => {
    setView(next);
    if (next === "together" && location !== "/nos-dois") setLocation("/nos-dois");
  };

  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  const initials = user?.name?.split(" ").slice(0, 2).map(part => part[0]).join("").toUpperCase() || "AF";
  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100">
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[276px] flex-col border-r border-white/[0.07] bg-[#0d0e15]/95 px-3 py-4 backdrop-blur-xl transition-transform duration-200 lg:translate-x-0 ${isMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-12 items-center justify-between px-2">
          <button onClick={() => setLocation("/")} className="flex items-center gap-3 text-left">
            <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-violet-400 to-indigo-600 shadow-lg shadow-violet-950/40"><img src="/manus-storage/atlas-finance-icon_c0f2865b.png" alt="" className="h-full w-full object-cover" /></span>
            <span><span className="block text-sm font-semibold tracking-[-0.03em] text-white">Atlas Finance</span><span className="block text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">Patrimônio pessoal</span></span>
          </button>
          <button className="rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-white lg:hidden" onClick={() => setMenuOpen(false)} aria-label="Fechar menu"><X className="h-4 w-4" /></button>
        </div>
        <div className="my-6 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-1.5">
          <button onClick={() => chooseView("individual")} className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-medium transition ${!isTogether ? "bg-white/10 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"}`}><WalletCards className="h-3.5 w-3.5" /> Minhas finanças</button>
          <button onClick={() => chooseView("together")} className={`mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-medium transition ${isTogether ? "bg-violet-500/20 text-violet-100 shadow-sm" : "text-slate-500 hover:text-slate-300"}`}><UsersRound className="h-3.5 w-3.5" /> Nós dois <span className="ml-auto h-1.5 w-1.5 rounded-full bg-violet-400" /></button>
        </div>
        <nav className="space-y-1">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">Organização</p>
          {navigation.map(item => {
            const isActive = item.path === location;
            return <button key={item.path} onClick={() => { setLocation(item.path); setMenuOpen(false); }} className={`flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm transition ${isActive ? "bg-white/[0.09] font-medium text-white" : "text-slate-500 hover:bg-white/[0.045] hover:text-slate-200"}`}><item.icon className={`h-4 w-4 ${isActive ? "text-violet-300" : ""}`} />{item.label}</button>;
          })}
          <div className="my-5 h-px bg-white/[0.06]" />
          <button onClick={() => { chooseView("together"); setMenuOpen(false); }} className={`flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm transition ${location === "/nos-dois" ? "bg-violet-500/15 font-medium text-violet-100" : "text-slate-500 hover:bg-white/[0.045] hover:text-slate-200"}`}><UsersRound className="h-4 w-4" />Nós dois{household.data?.complete && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400" />}</button>
          <button onClick={() => { setLocation("/configuracoes"); setMenuOpen(false); }} className={`flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm transition ${location === "/configuracoes" ? "bg-white/[0.09] font-medium text-white" : "text-slate-500 hover:bg-white/[0.045] hover:text-slate-200"}`}><Settings className="h-4 w-4" />Configurações</button>
        </nav>
        <div className="mt-auto space-y-3">
          {installPrompt && <button onClick={install} className="flex w-full items-center gap-3 rounded-xl border border-violet-400/20 bg-violet-500/10 px-3 py-2.5 text-left text-xs font-medium text-violet-200 transition hover:bg-violet-500/15"><Download className="h-4 w-4" />Instalar aplicativo</button>}
          <DropdownMenu>
            <DropdownMenuTrigger asChild><button className="flex w-full items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-2 text-left transition hover:bg-white/[0.06]"><Avatar className="h-8 w-8 border border-white/10"><AvatarFallback className="bg-violet-500/15 text-[10px] font-semibold text-violet-200">{initials}</AvatarFallback></Avatar><span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium text-slate-200">{user?.name || "Meu perfil"}</span><span className="block truncate text-[10px] text-slate-500">Perfil protegido</span></span><ChevronDown className="h-3.5 w-3.5 text-slate-500" /></button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 border-white/10 bg-[#181923] text-slate-200"><DropdownMenuItem onClick={() => setLocation("/configuracoes")} className="gap-2 focus:bg-white/10 focus:text-white"><Settings className="h-4 w-4" />Configurações</DropdownMenuItem><DropdownMenuItem onClick={logout} className="gap-2 text-rose-300 focus:bg-rose-400/10 focus:text-rose-200"><LogOut className="h-4 w-4" />Sair</DropdownMenuItem></DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
      {isMenuOpen && <button className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setMenuOpen(false)} aria-label="Fechar menu" />}
      <main className="min-h-screen lg:ml-[276px]">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/[0.06] bg-[#090a0f]/80 px-4 backdrop-blur-xl sm:px-7 lg:px-9">
          <div className="flex items-center gap-3"><button className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Abrir menu"><Menu className="h-5 w-5" /></button><div><p className="text-xs font-medium text-slate-300">{isTogether ? "Visão compartilhada" : "Visão individual"}</p><p className="text-[11px] text-slate-600">{new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}</p></div></div>
          <div className="flex items-center gap-2"><button onClick={() => toast.info("A central de ajuda será ampliada em uma próxima versão.")} className="hidden rounded-lg p-2 text-slate-500 transition hover:bg-white/5 hover:text-slate-200 sm:inline-flex" aria-label="Ajuda"><CircleHelp className="h-4 w-4" /></button><button onClick={() => toast.info("Você está em dia: não há alertas pendentes.")} className="hidden rounded-lg p-2 text-slate-500 transition hover:bg-white/5 hover:text-slate-200 sm:inline-flex" aria-label="Notificações"><Bell className="h-4 w-4" /></button><span className="hidden h-5 w-px bg-white/[0.08] sm:block" /><span className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[10px] font-medium text-slate-400"><Sparkles className="h-3 w-3 text-violet-300" /> Atlas</span></div>
        </header>
        <div className="mx-auto max-w-[1600px] p-4 sm:p-7 lg:p-9">{children}</div>
      </main>
    </div>
  );
}
