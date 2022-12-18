import { createGqlServer } from '../../../libs/server'
import { PrismaClient } from '@prisma/client'
import { ApolloServer, gql } from 'apollo-server'
import { typeDefs } from './schema'
import { resolvers } from './index'
import { prisma } from './../../../libs/context'

let testServer: ApolloServer

beforeAll(async () => {
  testServer = await createGqlServer({
    resolvers: resolvers,
    typeDefs: typeDefs,
  })
  await prisma.list.createMany({
    data: [
      {
        id: 1,
        title: 'list A',
      },
    ],
  })
  await prisma.task.createMany({
    data: [
      {
        title: 'task C',
        listId: 1,
        listOrder: 2,
        completed: false,
      },
      {
        title: 'task B',
        listId: 1,
        listOrder: 1,
        completed: false,
      },
      {
        title: 'task A',
        listId: 1,
        listOrder: 0,
        completed: false,
      },
    ],
  })
})

afterAll(async () => {
  await prisma.task.deleteMany()
  await prisma.list.deleteMany()

  await prisma.$disconnect()
})

it('should ping', async () => {
  const response = await testServer.executeOperation({
    query: gql`
      query ping($message: String) {
        ping(message: $message)
      }
    `,
    variables: { message: 'TEST' },
  })

  expect(response.data?.ping).toEqual('PING:TEST')
})

it('should return lists', async () => {
  const response = await testServer.executeOperation({
    query: gql`
      query lists {
        lists {
          title
          tasks {
            title
          }
        }
      }
    `,
  })

  expect(response).toEqual(
    expect.objectContaining({
      data: {
        lists: [
          {
            title: 'list A',
            tasks: [
              { title: 'task A' },
              { title: 'task B' },
              { title: 'task C' },
            ],
          },
        ],
      },
    })
  )
})
