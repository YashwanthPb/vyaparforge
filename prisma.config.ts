import path from 'node:path'
import { defineConfig } from 'prisma/config'
import { config } from 'dotenv'

config()
config({ path: '.env.local', override: true })

export default defineConfig({
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '',
  },
})
