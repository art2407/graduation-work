FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# prisma generate only reads the schema to generate TypeScript types;
# it doesn't connect to the DB, but Prisma 5 still validates env() refs at parse time.
# A dummy URL satisfies the parser without a real DB.
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" npx prisma generate

EXPOSE 4000

CMD ["sh", "-c", "npx prisma db push --accept-data-loss && npm run start:dev"]
