import { Prisma } from '@prisma/client'
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

    await ctx.prisma.task.updateMany({
      where: {
        AND: [
          { listOrder: { gt: originalPosition } },
          { listOrder: { lte: originalPosition } },
        ],
        // listOrder: {
        //   gt: originalPosition,
        //   lte: destinationPosition,
        // },
      },
      data: {
        listOrder: {
          ...(originalPosition > destinationPosition
            ? {
                decrement: 1,
              }
            : {
                increment: 1,
              }),
        },
      },
    })
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

    await ctx.prisma.task.updateMany({
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

    return {
      success: true,
    }
  },

  deleteList: async (_, { id }, ctx) => {
    await ctx.prisma.list.delete({
      where: {
        id: Number(id),
      },
    })
    return {
      success: true,
    }
  },
}
