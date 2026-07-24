# PWA et notifications push

## 1. Ce qui fonctionne sans aucune configuration

L'application est déjà installable et utilisable hors connexion. Aucune clé
n'est requise pour cela :

- manifeste, icônes et écran d'installation ;
- coquille applicative mise en cache — l'application s'ouvre sans réseau ;
- référentiels (périodes, types de note) servis depuis le cache en cas de
  coupure ;
- file d'attente des saisies de notes, rejouée au retour de la connexion.

**Les notes ne sont jamais mises en cache.** Montrer à un parent une moyenne
périmée comme si elle était à jour serait pire que de ne rien montrer : hors
connexion, un bandeau annonce que les données peuvent ne pas être à jour.

Sans configuration Firebase, seules les **notifications** sont inactives, et
l'écran « Alertes » de l'espace parent l'explique.

## 2. Où mettre la clé — réponse courte

> *« J'espère que c'est la clé de certificat web push »*

Oui. La **clé publique du certificat Web Push** est bien la clé VAPID attendue.
Elle va dans `.env.local` du frontend :

```dotenv
VITE_FIREBASE_VAPID_KEY=BEl...   # clé publique du certificat Web Push
```

Mais elle **ne suffit pas seule**. Il faut aussi la configuration web du
projet, sans laquelle le SDK ne sait pas à quel projet Firebase s'adresser.
Trois blocs de valeurs, à trois endroits différents, à ne pas confondre :

| Valeur | Où la trouver | Où la mettre |
|---|---|---|
| Configuration web (`apiKey`, `appId`, `messagingSenderId`…) | Console Firebase → **Paramètres du projet** → **Général** → *Vos applications* → application **Web** | `frontend/.env.local` |
| **Clé publique du certificat Web Push** (VAPID) | Console Firebase → **Paramètres du projet** → **Cloud Messaging** → *Certificats Web Push* → **Paire de clés** | `frontend/.env.local` |
| Compte de service (`FIREBASE_PRIVATE_KEY`…) | Console Firebase → **Paramètres du projet** → **Comptes de service** → *Générer une nouvelle clé privée* | `backend/.env` |

⚠️ **Ne mettez jamais la clé privée du compte de service dans le frontend.**
Elle permet d'envoyer des notifications à n'importe qui ; tout ce qui commence
par `VITE_` se retrouve en clair dans le bundle téléchargé par le navigateur.

À l'inverse, les valeurs `VITE_FIREBASE_*` **sont publiques par conception** :
elles identifient le projet et n'autorisent aucun envoi. Les voir dans le code
source de la page est normal.

## 3. Marche à suivre

### a. Créer l'application web

Console Firebase → **Paramètres du projet** → **Général** → *Vos applications*
→ **Ajouter une application** → **Web** (icône `</>`). Nommez-la par exemple
`Gesnotes Web`. Firebase affiche alors un objet `firebaseConfig` : recopiez ses
champs dans `frontend/.env.local`.

```dotenv
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=votre-projet.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=votre-projet
VITE_FIREBASE_STORAGE_BUCKET=votre-projet.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abc123
```

### b. Générer le certificat Web Push

**Paramètres du projet** → **Cloud Messaging** → section *Certificats Web
Push* → **Générer une paire de clés**. Copiez la **clé publique** (une longue
chaîne commençant généralement par `B`) :

```dotenv
VITE_FIREBASE_VAPID_KEY=BEl...
```

### c. Vérifier le backend

`backend/.env` doit contenir le compte de service et basculer l'envoi réel :

```dotenv
PUSH=fcm
FIREBASE_PROJECT_ID=votre-projet
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@votre-projet.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"

# Cible des liens de notification et des emails : l'URL du frontend.
WEB_APP_URL="http://localhost:5173"
```

Les sauts de ligne de la clé privée restent en `\n` littéraux, valeur entre
guillemets.

Avec `PUSH=console` (défaut), rien n'est envoyé et le message est seulement
tracé dans les logs — pratique pour développer sans consommer de quota.

### d. Redémarrer

Vite ne relit `.env.local` qu'au démarrage.

```bash
cd frontend && npm run dev
```

## 4. Essayer

1. Connectez-vous avec un **compte parent** (`npm run prisma:seed:demo` en crée).
2. Onglet **Alertes** → *Activer les notifications* → acceptez l'invite du
   navigateur.
3. L'appareil apparaît dans la liste ; côté backend, `POST /parents/me/devices`
   a été appelé.
4. Avec un **compte enseignant**, saisissez une note pour l'enfant de ce parent.
5. Application fermée → notification système. Application ouverte → message
   dans l'application, FCM n'affichant alors rien de lui-même.

## 5. Points d'attention

**HTTPS obligatoire.** Les service workers et le push exigent un contexte sûr.
`http://localhost` est considéré comme sûr ; une adresse IP de réseau local
(`http://192.168.x.x`) ne l'est pas — pour tester sur un téléphone, passez par
un tunnel HTTPS.

**iOS 16.4 et plus.** Safari n'autorise le push que si l'application a été
**ajoutée à l'écran d'accueil**. Tant qu'elle est ouverte dans un onglet, le
bouton d'activation reste sans effet ; l'écran Alertes le signale.

**Un jeton par appareil, pas par compte.** Activer sur le téléphone n'active
pas sur l'ordinateur. La déconnexion retire le jeton : un parent qui rend un
appareil emprunté ne doit pas continuer d'y recevoir les notes de ses enfants.

**Un seul service worker.** `src/sw.ts` porte à la fois le cache hors connexion
et la réception FCM. Une seule inscription peut contrôler une portée donnée :
ajouter un `firebase-messaging-sw.js` séparé désactiverait le mode hors
connexion. C'est pourquoi `getToken()` reçoit explicitement l'inscription
existante.

**Icônes.** Les icônes du manifeste sont des SVG, acceptés par Chrome et Edge.
Pour un rendu optimal sur l'ensemble des plateformes, ajoutez des PNG 192×192
et 512×512 dans `public/icons/` et déclarez-les dans `vite.config.ts`.
