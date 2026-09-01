# Image Playwright (Debian, pas Alpine) plutôt que node:20-alpine : le build
# lance un vrai Chromium pour le prérendu SEO (voir scripts/prerender.mjs),
# et le Chromium fourni par Playwright ne fonctionne pas sur musl/Alpine.
# Cette image embarque déjà Chromium et ses dépendances système — Playwright
# exige que la version du paquet npm corresponde exactement au binaire du
# navigateur, donc "playwright" est épinglé sans "^" dans package.json (pas
# de plage possible) : un écart silencieux ferait échouer le lancement de
# Chromium ici, ou pire, réussirait avec un binaire incompatible. Faire
# évoluer l'un sans l'autre casse le build.
FROM mcr.microsoft.com/playwright:v1.62.1-jammy AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
