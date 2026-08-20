# Atlas Finance

O **Atlas Finance** é um aplicativo de gestão financeira pessoal com uma visão individual protegida por autenticação e uma visão consolidada para duas pessoas, chamada **Nós dois**. A aplicação foi projetada para organizar patrimônio, contas, transações, orçamentos, metas e relatórios em uma experiência responsiva de dark mode.

## Como usar

Após criar um acesso local com **e-mail e senha**, complete a jornada inicial para confirmar BRL, cadastrar a primeira conta e, opcionalmente, iniciar o vínculo seguro em **Nós dois**. Em seguida, registre receitas e despesas com categoria, etiquetas, data, descrição e, quando necessário, um comprovante de até 5 MB nos formatos PNG, JPG, WebP ou PDF. Os indicadores e relatórios passam a refletir os dados cadastrados no seu perfil.

| Área | Finalidade |
| --- | --- |
| Visão geral | Acompanha saldo, patrimônio, receitas, despesas, variação e movimentações recentes. |
| Transações | Registra, edita e remove lançamentos individuais, com categorias, etiquetas e anexo opcional. |
| Contas | Organiza conta corrente, poupança, cartão, investimento, dinheiro e outras carteiras. |
| Orçamento | Define limites mensais por categoria e exibe o consumo de cada limite. |
| Metas | Cria objetivos com prazo e registra contribuições ao longo do tempo. |
| Relatórios | Exibe evolução patrimonial, fluxo de caixa, categorias e leituras de período. |
| Nós dois | Cria ou aceita um convite para consolidar os dados de dois perfis. |
| Planejamento | Centraliza recorrências, revisão, transferências, orçamento base zero, previsão, regras, CSV, dívidas e investimentos manuais. |

## Privacidade e espaço compartilhado

No modo individual, cada consulta e alteração é restrita ao proprietário autenticado. O modo **Nós dois** só é liberado depois que dois perfis aceitam o mesmo vínculo. Ele consolida indicadores e relatórios para leitura, mas mantém a autoria de cada transação e não permite editar dados do parceiro pela visão conjunta.

## Execução independente

O aplicativo usa autenticação local por e-mail e senha, sessões assinadas em cookies HTTP-only, MySQL e um adaptador de anexos em disco. Não exige o runtime, login, telemetria, proxy de armazenamento ou hospedagem da plataforma anterior. Para executar fora dela, instale Node.js 22 e MySQL 8, copie [`.env.example`](./.env.example) para `.env`, configure as variáveis detalhadas em [`docs/ENVIRONMENT.md`](./docs/ENVIRONMENT.md), execute `pnpm install`, `pnpm db:migrate` e `pnpm dev`. Como alternativa, use `docker compose up --build`; antes de expor o serviço, altere as senhas presentes no arquivo de composição.

> Para uma implantação com múltiplas instâncias, use um volume persistente ou substitua o adaptador de anexos por armazenamento S3 compatível. Integrações bancárias e cotações ao vivo requerem provedores, contratos e consentimento próprios; elas não são simuladas nesta versão.

Os recursos entregues a partir do benchmark e suas evidências técnicas estão consolidados em [`docs/FEATURE_COVERAGE.md`](./docs/FEATURE_COVERAGE.md).

## Instalação como aplicativo

Depois de a versão ser publicada, abra o Atlas Finance em um navegador compatível. No desktop, procure a opção de instalação na barra de endereço ou no menu do navegador. No celular, use a opção **Adicionar à tela inicial** ou **Instalar aplicativo**. O manifesto, os ícones e o service worker já estão configurados.

## Validação técnica

O projeto possui checagem TypeScript, testes automatizados para sessão e cálculos financeiros, além de build de produção validado. A interface foi verificada nas larguras de desktop e mobile, incluindo o fluxo sem vínculo na tela **Nós dois**.

## Limites atuais

O produto foi configurado para valores em real brasileiro (BRL). A integração automática com bancos, importação de extratos e notificações externas não fazem parte desta primeira versão; os lançamentos são cadastrados manualmente para preservar controle e privacidade.
