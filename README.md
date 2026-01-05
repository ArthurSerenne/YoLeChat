# YoLeChat

## La base

Faut juste **Node.js (v18+)** et **npm**, sinon tu vas pas pouvoir lancer.

## Pour installer

1.  **Tu télécharges les dépendances** vite fait :
    ```bash
    npm install
    ```

2.  **Le `.env`** :
    Crée ce fichier à la racine sinon ça marchera jamais. :
    ```env
    PORT=3000
    JWT_SECRET=les_gens_qui_ecoute_du_Theodora_ils_se_forcent_a_lecouter_parceque_cest_pas_fou_du_tout
    DATABASE_URL=file:./dev.db
    ```

3.  **La BDD (Prisma)** :
    Tu génères le client et tu balances tout ça dans la db locale :
    ```bash
    npx prisma generate
    npx prisma db push
    ```

## Et pour lancer

Tu démarres le serveur dev :

```bash
npm run start:dev
```

Et puis c'est tout
