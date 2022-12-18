import { Prisma } from '@prisma/client'
import { UserInputError } from 'apollo-server'
import { Resolvers } from 'generated/types'
import { Context } from '../../../libs/context'

export const mutation: Resolvers<Context>['Mutation'] = {
  ping: (_parent, { message }) => `PING:${message}`,

  createList: (_, _args, ctx) =>
    ctx.prisma.list.create({
      data: _args.input,
    }),

  updateList: (_, _args, ctx) =>
    ctx.prisma.list.update({
      where: {
        id: Number(_args.id),
      },
      data: _args.input,
    }),

  createTask: async (_, _args, ctx) => {
    await ctx.prisma.task.updateMany({
      where: {
        listId: Number(_args.listId),
      },
      data: {
        listOrder: { increment: 1 },
      },
    })
    return ctx.prisma.task.create({
      data: {
        listId: Number(_args.listId),
        title: _args.input.title,
        completed: false,
        listOrder: 0, // TODO: append the order
      },
    })
  },

  updateTask: (_, { id, input }, ctx) =>
    ctx.prisma.task.update({
      where: { id: Number(id) },
      data: input as Prisma.TaskUncheckedUpdateInput,
    }),

  updateTaskPosition: async (_, { id, input }, ctx) => {
    const taskToMove = await ctx.prisma.task.findUniqueOrThrow({
      where: { id: Number(id) },
    })
    const originalPosition = taskToMove.listOrder
    const destinationPosition = input.listOrder

    if (originalPosition < destinationPosition) {
      await ctx.prisma.task.updateMany({
        where: {
          AND: [
            { listOrder: { gt: originalPosition } },
            { listOrder: { lte: destinationPosition } },
          ],
        },
        data: {
          listOrder: {
            decrement: 1,
          },
        },
      })
    } else if (originalPosition > destinationPosition) {
      await ctx.prisma.task.updateMany({
        where: {
          AND: [
            { listOrder: { gte: destinationPosition } },
            { listOrder: { lt: originalPosition } },
          ],
        },
        data: {
          listOrder: {
            increment: 1,
          },
        },
      })
    } else {
      throw new UserInputError('listOrder is the same as existing value')
    }

    return ctx.prisma.task.update({
      where: { id: Number(id) },
      data: {
        listOrder: destinationPosition,
      },
    })
  },

  deleteTask: async (_, { id }, ctx) => {
    const deletedTask = await ctx.prisma.task.delete({
      where: { id: Number(id) },
    })

    return ctx.prisma.task
      .updateMany({
        where: {
          listOrder: {
            gt: deletedTask.listOrder,
          },
        },
        data: {
          listOrder: {
            decrement: 1,
          },
        },
      })
      .then(() => ({ success: true }))
      .catch(e => {
        console.error(e)
        return { success: false }
      })
  },

  deleteList: async (_, { id }, ctx) => {
    return ctx.prisma.list
      .delete({
        where: {
          id: Number(id),
        },
      })
      .then(() => ({ success: true }))
      .catch(e => {
        console.error(e)
        return { success: false }
      })
  },
}
