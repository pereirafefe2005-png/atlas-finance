# Cobertura de recursos competitivos

Esta matriz conecta cada capacidade priorizada no benchmark à implementação original correspondente e à evidência de validação. Ela não representa afiliação, cópia de interface ou reutilização de código de nenhum produto analisado.

| Recurso priorizado | Módulo principal | Evidência automatizada ou de execução |
| --- | --- | --- |
| Recorrências, assinaturas e calendário | `server/premiumRouter.ts`, `client/src/pages/Planning.tsx` | `pnpm check`, build de produção e tela Planejamento integrada ao roteador. |
| Revisão, divisão e transferência | `server/premiumRouter.ts`, `Planning.tsx` | `server/finance.operations.test.ts` e validação TypeScript. |
| Orçamento base zero e rollover | `drizzle/schema.ts`, `premiumRouter.ts`, `Planning.tsx` | `server/finance.test.ts` e build de produção. |
| Previsão e alertas internos | `premiumRouter.ts`, `Planning.tsx` | `server/finance.test.ts` e validação TypeScript do cálculo projetado. |
| Regras e importação/exportação CSV | `premiumRouter.ts`, `Planning.tsx` | Contratos tRPC validados por `pnpm check`; importação permanece local e validada antes de persistir. |
| Dívidas e investimentos manuais | `drizzle/schema.ts`, `premiumRouter.ts`, `Planning.tsx` | Validação do esquema, tRPC e build de produção. |
| Espaço compartilhado a dois | `server/db.ts`, `server/routers.ts`, `client/src/pages/Together.tsx` | `server/finance.access.test.ts` cobre isolamento e ativação do vínculo. |
| Autenticação local e sessão | `server/localAuth.ts`, `server/routers.ts`, `client/src/_core/hooks/useAuth.ts` | `server/localAuth.test.ts` valida hash e verificação de senha; `server/auth.logout.test.ts` valida encerramento da sessão. |
| Upload local de comprovantes | `server/storage.ts` | `server/storage.test.ts` valida persistência local, normalização da chave e URL servida. |
| Instalação como PWA | `manifest.webmanifest`, `service-worker.js`, `main.tsx` | `client/src/pwa.test.ts` valida manifesto, service worker e registro no cliente. |

## Escopo das validações

Os testes de autenticação verificam derivação e confirmação de senha, além da limpeza do cookie de sessão. As regras de validação de cadastro e login ficam nos contratos tRPC da API e são verificadas pela checagem de tipos e build. O teste de upload usa diretório temporário e não toca arquivos de usuários. O teste PWA confirma os artefatos e o registro no cliente; a apresentação da opção de instalar continua sendo uma decisão do navegador, conforme sua política e o contexto HTTPS.
