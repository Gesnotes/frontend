# Démarrage en local

## En bref

```bash
# 1. Backend
cd backend
npm install
npm run prisma:seed        # ou prisma:seed:demo pour un établissement complet
npm run dev                # http://localhost:3000

# 2. Frontend
cd frontend
npm install
cp .env.example .env.local # aucune valeur à remplir
npm run dev                # http://localhost:5173
```

Puis connectez-vous avec l'un des comptes affichés par le seed.

## Comptes

`npm run prisma:seed` — un compte par rôle, plus une classe, une matière et un
élève rattaché, pour que les trois espaces aient quelque chose à montrer :

```
admin@ecole-demo.test  / admin1234
prof@ecole-demo.test   / admin1234
parent@ecole-demo.test / admin1234
```

`npm run prisma:seed:demo` — établissement complet : 8 classes, 8 matières,
5 enseignants, 40 élèves, 32 parents, 410 notes.

```
directrice@ecole-lumiere.bj    / demo1234
r.hounkpatin@ecole-lumiere.bj  / demo1234
parent.<nom>.<id>@famille.bj   / demo1234
```

⚠️ Les deux seeds créent **deux écoles distinctes** (`ecole-demo` et
`ecole-lumiere`). Un compte de l'une ne peut pas se connecter à l'autre —
c'est l'isolation multi-établissements, elle est volontaire.

## Connexion

Pas de sous-domaine ni d'école à configurer côté frontend : l'écran de
connexion demande un email (ou un téléphone) et un mot de passe, et l'API
(`POST /auth/identify`) cherche cet identifiant à travers toutes les écoles.
Si le même identifiant/mot de passe est valable dans plusieurs écoles à la
fois, l'écran de connexion propose de choisir laquelle avant de continuer.

Si la connexion échoue avec de bons identifiants, vérifiez d'abord que le
seed a bien été lancé (`npm run prisma:seed`) — le message renvoyé reste
volontairement générique (« Email, téléphone ou mot de passe incorrect »)
pour ne jamais permettre d'énumérer les comptes existants.

## Pas de CORS : le proxy

Le frontend appelle `/api/...` sur sa propre origine ; Vite relaie vers le
backend (`vite.config.ts`). Aucun préflight CORS, et une seule variable si le
backend écoute ailleurs :

```dotenv
VITE_API_PROXY_TARGET=http://localhost:4000
```

## Essayer sur un téléphone

C'est le seul moyen de vérifier réellement la PWA et les notifications.

Le serveur Vite écoute déjà sur toutes les interfaces (`host: true`), donc
`http://<ip-de-votre-machine>:5173` fonctionne depuis un téléphone du même
réseau — et le proxy fait suivre l'API, ce qu'une adresse `localhost:3000`
codée en dur aurait rendu impossible.

⚠️ Les service workers et le push exigent un **contexte sûr** : `localhost`
l'est, une IP de réseau local ne l'est pas. Pour tester l'installation et les
notifications sur un vrai appareil, passez par un tunnel HTTPS
(`cloudflared tunnel --url http://localhost:5173`, `ngrok http 5173`…) et
renseignez son URL dans `WEB_APP_URL` côté backend, pour que les liens des
emails et des notifications pointent au bon endroit.
