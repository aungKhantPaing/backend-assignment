import { Resolvers } from 'generated/types'
import { Context } from '../../../libs/context'

export const query: Resolvers<Context>['Query'] = {
  lists: (_, _args, ctx) => ctx.prisma.list.findMany(),
}
