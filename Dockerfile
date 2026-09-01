# Image Playwright (Debian, pas Alpine) plutôt que node:20-alpine : le build
# lance un vrai Chromium pour le prérendu SEO (voir scripts/prerender.mjs),
# et le Chromium fourni par Playwright ne fonctionne pas sur musl/Alpine.
# Cette image embarque déjà Chromium et ses dépendances système — la version
# doit rester alignée avec celle de "playwright" dans package.json.
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
