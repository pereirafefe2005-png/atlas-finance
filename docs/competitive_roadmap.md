# Roadmap competitivo e arquitetura independente

## Critério de seleção

O benchmark identificou padrões presentes nos principais planos pagos: recorrências e assinaturas, orçamento flexível, consolidação do patrimônio, planejamento de caixa, automação de categorias, colaboração de casal, metas, dívida, exportação e análise de investimentos. Esses padrões serão recriados como **funções originais do Atlas Finance**, sem reutilizar marca, fluxos visuais, textos, dados, código ou algoritmos proprietários de terceiros. As fontes oficiais estão registradas em [benchmark_sources.md](./benchmark_sources.md).

| Prioridade | Recurso original do Atlas | Referências funcionais | Decisão de implementação |
| --- | --- | --- |
| P0 | Central de recorrências e calendário de contas | Monarch, Copilot, Rocket Money, PocketGuard | Regras de recorrência, próximas ocorrências, cobrança prevista e painel de assinaturas manuais. |
| P0 | Controle de revisão, divisão e transferência | Monarch, PocketGuard, Spendee | Transações revisáveis, lançamento dividido entre categorias e transferência entre contas sem distorcer receita/despesa. |
| P0 | Orçamento avançado | Copilot, PocketGuard, EveryDollar, Goodbudget | Planejamento base zero, rollover por categoria, valor restante e visão de dinheiro disponível. |
| P0 | Previsão financeira e alertas no aplicativo | Copilot, Rocket Money, PocketGuard, Spendee | Fluxo de caixa projetado, alertas de orçamento, saldo baixo e recorrência próxima; sem notificações externas nesta etapa. |
| P1 | Regras de categorização e importação/exportação CSV | Copilot, Spendee, Tiller, EveryDollar | Regras baseadas em descrição e categoria; exportação e importação CSV validada. |
| P1 | Planejador de dívidas e investimentos | PocketGuard, EveryDollar, Copilot | Plano manual de amortização e acompanhamento manual de posições/alocação; cotações em tempo real ficam condicionadas a fonte de dados contratada. |
| P1 | Colaboração refinada para casal | Monarch, EveryDollar, Spendee, Tiller | Espaço Nós dois com permissões, autoria preservada, filtro por responsável e convites revogáveis. |

## Limites de paridade

O Atlas Finance pode implementar os recursos de software acima de modo independente. Contudo, **sincronização bancária, negociação humana de contas, coaching profissional, pontuação de crédito e cotações em tempo real** exigem contratos próprios com provedores financeiros, consentimento do usuário e, em alguns casos, licenças ou infraestrutura de terceiros. Essas capacidades não serão simuladas nem alegadas como prontas sem uma integração legítima.

## Arquitetura de execução independente

| Camada | Implementação portátil | Configuração necessária |
| --- | --- | --- |
| Interface | React, Vite, TypeScript e PWA | `VITE_APP_TITLE`, URL pública opcional. |
| API | Express e tRPC em Node.js | `PORT`, `NODE_ENV`, `APP_ORIGIN`. |
| Autenticação | Sessão assinada em cookie HTTP-only e credenciais de e-mail/senha com hash forte. | `JWT_SECRET`, `SESSION_SECRET`, `APP_ORIGIN`. |
| Dados | MySQL com Drizzle ORM. | `DATABASE_URL`. |
| Anexos | Disco local no desenvolvimento; armazenamento S3 compatível em produção. | `STORAGE_DRIVER`, credenciais e bucket quando aplicável. |
| Implantação | Docker multiestágio e `docker-compose` com MySQL para uso próprio. | Arquivo `.env` derivado de `.env.example`. |

Essa arquitetura remove a dependência de autenticação, APIs internas, proxy de arquivos, runtime e hospedagem específicos da plataforma atual. Ela continua permitindo a escolha de qualquer provedor compatível com Node.js, Docker, MySQL e, opcionalmente, S3.
