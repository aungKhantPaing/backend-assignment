import { Resolvers } from 'generated/types'
import { Context } from '../../../libs/context'
import { list } from './list'
import { mutation } from './mutation'
import { query } from './query'

export const resolvers: Resolvers<Context> = {
  Query: query,
  Mutation: mutation,
  List: list,
}
