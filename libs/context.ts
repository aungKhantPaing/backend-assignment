import { PrismaClient } from '@prisma/client'
import type { ExpressContext } from 'apollo-server-express'
import { mockDeep, DeepMockProxy } from 'jest-mock-extended'

export const prisma = new PrismaClient()

export interface Context {
  prisma: PrismaClient
}

export function createContext(ctx: ExpressContext): Context {
  return {
    ...ctx,
    prisma,
  }
}
