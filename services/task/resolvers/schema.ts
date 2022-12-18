import { MutationResult, MutationResolvers } from '../../../generated/types'
import { gql } from 'apollo-server'

export const typeDefs = gql`
  type List {
    id: ID!
    title: String!
    tasks: [Task!]!
  }

  type Task {
    id: ID!
    title: String!
    completed: Boolean!
    listOrder: Int!
  }

  input CreateListInput {
    title: String!
  }

  input UpdateListInput {
    title: String!
  }

  input CreateTaskInput {
    title: String!
  }

  input UpdateTaskInput {
    title: String
    completed: Boolean
  }

  input UpdateTaskPositionInput {
    listId: ID
    listOrder: Int!
  }

  type MutationResult {
    success: Boolean!
  }

  type Query {
    ping(message: String): String!
    lists: [List!]!
  }

  type Mutation {
    ping(message: String): String!

    createList(input: CreateListInput!): List!
    updateList(id: ID!, input: UpdateListInput!): List!
    deleteList(id: ID!): MutationResult!

    createTask(listId: ID!, input: CreateTaskInput!): Task!
    updateTask(id: ID!, input: UpdateTaskInput!): Task!
    updateTaskPosition(id: ID!, input: UpdateTaskPositionInput!): Task!
    deleteTask(id: ID!): MutationResult!
  }
`
