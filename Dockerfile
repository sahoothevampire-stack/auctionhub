# Use official Node.js LTS image
FROM node:20-alpine

# Install pnpm globally and enable corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies with frozen lockfile (ensures exact versions)
RUN pnpm install --frozen-lockfile

# Copy all source code (after dependencies are installed)
COPY . .

# Build Next.js application
RUN pnpm run build

# Expose port 3000
EXPOSE 3000

# Start the application
CMD ["pnpm", "start"]
