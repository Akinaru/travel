# Voyages

Application web pour préparer et partager des voyages : réservations, programme jour par jour,
documents (visa, billets, passeport), démarches avec suivi, idées de destination votées à deux.

Stack : Next.js 16, Postgres (Drizzle ORM), Better Auth (email + mot de passe, Google).

## Démarrer en local

```bash
cp .env.example .env                       # puis remplir BETTER_AUTH_SECRET (openssl rand -base64 32)
docker compose -f docker-compose.dev.yml up -d   # Postgres sur le port 5433
pnpm install
pnpm db:migrate                            # nécessite DATABASE_URL dans l'environnement
pnpm dev
```

Ouvrir http://localhost:3000 et créer un compte.

## Photos automatiques

- Destination, idées, ville d'arrivée d'un vol : photo de l'article Wikivoyage (repli sur Wikipédia).
- Logement ou activité avec un lien : image de l'annonce (`og:image`). Si le site la bloque, photo de la ville.

Aucune clé d'API n'est nécessaire. Les liens saisis sont récupérés côté serveur avec un blocage des
adresses internes (voir `src/lib/images.ts`).

## Documents

Les fichiers (PDF, photos, 15 Mo max) sont stockés dans `UPLOAD_DIR`, hors du dossier public.
Ils ne sont servis que par `/api/documents/[id]`, après vérification que l'utilisateur est membre du voyage.

## Déployer sur Coolify

1. **+ New → Private Repository (with GitHub App)** (ou **Public Repository** si le dépôt est public),
   branche `main`, **Build Pack : Docker Compose**, fichier `/docker-compose.yml`.
2. Dans l'onglet **Environment Variables** :
   - `POSTGRES_PASSWORD` : mot de passe fort (`openssl rand -base64 24`)
   - `BETTER_AUTH_SECRET` : `openssl rand -base64 32`
   - `BETTER_AUTH_URL` : l'URL publique, ex. `https://voyages.mondomaine.fr`
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` : facultatif
3. Dans la configuration du service **app**, renseigner le domaine avec le port : `https://voyages.mondomaine.fr:3000`
   (Coolify route le domaine vers le port 3000 du conteneur et gère le certificat HTTPS).
4. **Deploy**. Les migrations s'appliquent au démarrage du conteneur.

La base n'est pas exposée sur Internet. Les volumes `db-data` (base) et `uploads` (documents) sont
conservés entre deux déploiements : pensez à activer les sauvegardes de Coolify.

### Connexion Google

Dans Google Cloud Console, créer un identifiant OAuth « Application Web » avec l'URI de redirection
`${BETTER_AUTH_URL}/api/auth/callback/google`. Sans ces variables, le bouton Google est masqué.

## Commandes

| Commande | Rôle |
| --- | --- |
| `pnpm dev` | Serveur de développement |
| `pnpm db:generate` | Générer une migration après modification de `src/db/schema.ts` |
| `pnpm db:migrate` | Appliquer les migrations |
| `pnpm lint` | ESLint |
