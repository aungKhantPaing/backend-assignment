import { Resolvers } from 'generated/types'
import { Context } from '../../../libs/context'

export const list: Resolvers<Context>['List'] = {
  tasks: (_parent, _args, ctx) =>
    ctx.prisma.list
      .findUnique({
        where: {
          id: _parent.id,
        },
      })
      .tasks({
        orderBy: {
          listOrder: 'asc',
        },
      }),
}
