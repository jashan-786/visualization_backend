From node:latest
Workdir /app
copy package.json package-lock.json ./
run npm install --legacy-peer-deps
copy . .
run npm run build
expose 3000
cmd ["npm", "start"]