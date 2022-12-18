import { Resolvers } from 'generated/types'
import { Context } from '../../../libs/context'

export const query: Resolvers<Context>['Query'] = {
  ping: (_parent, { message }) => `PING:${message}`,
  lists: (_, _args, ctx) => ctx.prisma.list.findMany(),
}
