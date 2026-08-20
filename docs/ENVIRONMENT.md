# Variáveis de ambiente para execução independente

Copie os valores abaixo para um arquivo `.env` no ambiente onde o aplicativo será executado. **Nunca versione esse arquivo nem reutilize os valores de exemplo em produção.**

| Variável | Obrigatória | Uso |
| --- | --- | --- |
| `DATABASE_URL` | Sim | Conexão MySQL no formato `mysql://usuario:senha@host:3306/banco`. |
| `SESSION_SECRET` | Sim | Chave aleatória com pelo menos 32 caracteres para assinar sessões. Gere uma chave única por ambiente. |
| `PORT` | Não | Porta HTTP; padrão `3000`. |
| `NODE_ENV` | Sim | Use `development` localmente e `production` no servidor. |
| `APP_ORIGIN` | Recomendado | Origem pública, por exemplo `https://financas.exemplo.com`. |
| `UPLOAD_DIR` | Recomendado | Diretório persistente para comprovantes; padrão `./uploads`. |

Em produção, use uma senha de banco forte, HTTPS no proxy reverso, backups criptografados do MySQL e um volume persistente para anexos. Para múltiplas réplicas da aplicação, substitua o adaptador local de arquivos por um serviço S3 compatível.
