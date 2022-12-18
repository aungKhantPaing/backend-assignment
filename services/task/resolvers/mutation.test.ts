import { PrismaClient } from '@prisma/client'
import { ApolloServer, gql } from 'apollo-server'
import { typeDefs } from './schema'
import { resolvers } from './index'
import { createGqlServer } from '../../../libs/server'
import { prisma } from './../../../libs/context'

let testServer: ApolloServer

beforeAll(async () => {
  testServer = await createGqlServer({
    resolvers: resolvers,
    typeDefs: typeDefs,
  })
  const lists = [
    {
      id: 1,
      title: 'list',
      tasks: [
        { id: 0, title: 'task A' },
        { id: 1, title: 'task B' },
        { id: 2, title: 'task C' },
        { id: 3, title: 'task D' },
        { id: 4, title: 'task E' },
        { id: 5, title: 'task F' },
      ],
    },
    {
      id: 2,
      title: 'list B',
      tasks: [{ id: 20, title: 'task O' }],
    },
    {
      id: 3,
      title: 'list C',
      tasks: [{ id: 30, title: 'task' }],
    },
    {
      id: 4,
      title: 'list D',
      tasks: [],
    },
  ]

  await prisma.list.createMany({
    data: lists.map(l => ({
      id: l.id,
      title: l.title,
    })),
  })
  await prisma.task.createMany({
    data: lists
      .map(l =>
        l.tasks.map((t, i) => ({
          id: t.id,
          title: t.title,
          listId: l.id,
          listOrder: i,
          completed: false,
        }))
      )
      .flat(),
  })
})

afterAll(async () => {
  await testServer.stop()
  await prisma.task.deleteMany()
  await prisma.list.deleteMany()

  await prisma.$disconnect()
})

it('should ping', async () => {
  const response = await testServer.executeOperation({
    query: gql`
      mutation ping($message: String) {
        ping(message: $message)
      }
    `,
    variables: { message: 'TEST' },
  })

  expect(response.data?.ping).toEqual('PING:TEST')
})

it('should create a list', async () => {
  const response = await testServer.executeOperation({
    query: gql`
      mutation createList($input: CreateListInput!) {
        createList(input: $input) {
          title
        }
      }
    `,
    variables: { input: { title: 'TODOs' } },
  })

  expect(response).toEqual(
    expect.objectContaining({
      data: {
        createList: {
          title: 'TODOs',
        },
      },
    })
  )
})

it('should update an existing list', async () => {
  const response = await testServer.executeOperation({
    query: gql`
      mutation updateList($id: ID!, $input: UpdateListInput!) {
        updateList(id: $id, input: $input) {
          title
        }
      }
    `,
    variables: { id: 1, input: { title: 'list A' } },
  })

  expect(response).toEqual(
    expect.objectContaining({
      data: {
        updateList: {
          title: 'list A',
        },
      },
    })
  )
})

describe('create new task', () => {
  it('should create a task under existing list', async () => {
    const response = await testServer.executeOperation({
      query: gql`
        mutation createTask($listId: ID!, $input: CreateTaskInput!) {
          createTask(listId: $listId, input: $input) {
            title
            completed
            listOrder
          }
        }
      `,
      variables: { listId: 2, input: { title: 'task N' } },
    })

    expect(response).toEqual(
      expect.objectContaining({
        data: {
          createTask: {
            title: 'task N',
            listOrder: 0,
            completed: false,
          },
        },
      })
    )
  })

  it('should ensure other tasks remain in correct position', async () => {
    const shiftedTasks = await prisma.task.findMany({
      where: {
        listId: 2,
      },
      select: {
        title: true,
      },
      orderBy: {
        listOrder: 'asc',
      },
    })
    expect(shiftedTasks.map(t => t.title)).toEqual(['task N', 'task O'])
  })
})

describe('update task', () => {
  it('should update the status of existing task', async () => {
    const response = await testServer.executeOperation({
      query: gql`
        mutation updateTask($id: ID!, $input: UpdateTaskInput!) {
          updateTask(id: $id, input: $input) {
            id
            completed
          }
        }
      `,
      variables: { id: 0, input: { completed: true } },
    })

    expect(response).toEqual(
      expect.objectContaining({
        data: {
          updateTask: {
            id: '0',
            completed: true,
          },
        },
      })
    )
  })

  it('should update the title of existing task', async () => {
    const response = await testServer.executeOperation({
      query: gql`
        mutation updateTask($id: ID!, $input: UpdateTaskInput!) {
          updateTask(id: $id, input: $input) {
            title
          }
        }
      `,
      variables: { id: 30, input: { title: 'task (edited)' } },
    })

    expect(response).toEqual(
      expect.objectContaining({
        data: {
          updateTask: {
            title: 'task (edited)',
          },
        },
      })
    )
  })
})

describe('update task position', () => {
  const origin = 1
  const destination = 4

  it('should move an existing task to the correct position', async () => {
    const response = await testServer.executeOperation({
      query: gql`
        mutation updateTaskPosition(
          $id: ID!
          $input: UpdateTaskPositionInput!
        ) {
          updateTaskPosition(id: $id, input: $input) {
            id
            listOrder
          }
        }
      `,
      variables: { id: 1, input: { listOrder: destination } },
    })

    expect(response).toEqual(
      expect.objectContaining({
        data: {
          updateTaskPosition: {
            id: '1',
            listOrder: destination,
          },
        },
      })
    )
  })

  it('should ensure other tasks remain in correct position', async () => {
    const shiftedTasks = await prisma.task.findMany({
      where: {
        listId: 1,
      },
      select: {
        title: true,
        listOrder: true,
      },
      orderBy: {
        listOrder: 'asc',
      },
    })
    expect(shiftedTasks.map(t => [t.title, t.listOrder])).toEqual([
      ['task A', 0],
      ['task C', 1],
      ['task D', 2],
      ['task E', 3],
      ['task B', 4], // <- moved task
      ['task F', 5],
    ])
  })

  it('should move the task to original position', async () => {
    const response = await testServer.executeOperation({
      query: gql`
        mutation updateTaskPosition(
          $id: ID!
          $input: UpdateTaskPositionInput!
        ) {
          updateTaskPosition(id: $id, input: $input) {
            id
            listOrder
          }
        }
      `,
      variables: { id: 1, input: { listOrder: origin } },
    })

    expect(response).toEqual(
      expect.objectContaining({
        data: {
          updateTaskPosition: {
            id: '1',
            listOrder: origin,
          },
        },
      })
    )
  })

  it('should ensure other tasks remain in correct position', async () => {
    const shiftedTasks = await prisma.task.findMany({
      where: {
        listId: 1,
      },
      select: {
        title: true,
        listOrder: true,
      },
      orderBy: {
        listOrder: 'asc',
      },
    })
    expect(shiftedTasks.map(t => [t.title, t.listOrder])).toEqual([
      ['task A', 0],
      ['task B', 1], // <- moved task
      ['task C', 2],
      ['task D', 3],
      ['task E', 4],
      ['task F', 5],
    ])
  })
})

describe('delete task', () => {
  it('should delete an existing task', async () => {
    const response = await testServer.executeOperation({
      query: gql`
        mutation deleteTask($id: ID!) {
          deleteTask(id: $id) {
            success
          }
        }
      `,
      variables: { id: 3 },
    })

    expect(response).toEqual(
      expect.objectContaining({
        data: {
          deleteTask: {
            success: true,
          },
        },
      })
    )
  })

  it('should ensure other tasks remain in correct position', async () => {
    const shiftedTasks = await prisma.task.findMany({
      where: {
        listId: 1,
      },
      select: {
        title: true,
        listOrder: true,
      },
      orderBy: {
        listOrder: 'asc',
      },
    })
    expect(shiftedTasks.map(t => [t.title, t.listOrder])).toEqual([
      ['task A', 0],
      ['task B', 1],
      ['task C', 2],
      ['task E', 3],
      ['task F', 4],
    ])
  })
})

describe('delete list', () => {
  it('should delete an existing list and its tasks', async () => {
    const response = await testServer.executeOperation({
      query: gql`
        mutation deleteList($id: ID!) {
          deleteList(id: $id) {
            success
          }
        }
      `,
      variables: { id: 1 },
    })

    expect(response).toEqual(
      expect.objectContaining({
        data: {
          deleteList: {
            success: true,
          },
        },
      })
    )
  })

  it('should ensure related tasks were also deleted', async () => {
    const remainingTasks = await prisma.task.findMany({
      where: {
        listId: 1,
      },
    })
    expect(remainingTasks).toEqual([])
  })
})
