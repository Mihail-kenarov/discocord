# Step 1: Build the app
FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

#  accept build-time arg and expose as env var
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

RUN npm run build

# Step 2: Run the app
FROM node:18-alpine AS runner

WORKDIR /app

# Copy only the necessary files from the builder stage
# COPY --from=builder /app/package.json ./package.json
# COPY --from=builder /app/node_modules ./node_modules
# COPY --from=builder /app/.next ./.next
# COPY --from=builder /app/public ./public

# #  runtime env var still needs to exist, so keep it here too
# ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
# ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

# ARG CLERK_SECRET_KEY
# ENV CLERK_SECRET_KEY=$CLERK_SECRET_KEY

# ARG CLERK_WEBHOOK_SIGNING_SECRET
# ENV CLERK_WEBHOOK_SIGNING_SECRET=$CLERK_WEBHOOK_SIGNING_SECRET

EXPOSE 3000
CMD ["npm", "start"]
