import {and, or, rule, shield} from 'graphql-shield'
import { getUserId } from '../utils'
import { Context } from '../context'

const rules = {
  isAuthenticatedUser: rule()((_parent, _args, context: Context) => {
    const userId = getUserId(context)
    return Boolean(userId)
  }),
  isPostOwner: rule()(async (_parent, args, context) => {
    const userId = getUserId(context)
    const author = await context.prisma.post
      .findUnique({
        where: {
          id: Number(args.id),
        },
      })
      .author()
    return userId === author.id
  }),
  isVideoGameOwner: rule()(async (_parent, args, context) => {
    const userId = getUserId(context)
    const author = await context.prisma.videoGame
        .findUnique({
          where: {
            id: Number(args.id),
          },
        })
        .author()
    return userId === author.id
  }),
  isAdmin: rule()(async (_parent, args, context) => {
    const userId = getUserId(context)
    const userRoles = await context.prisma.user
        .findUnique({
          where: {
            id: Number(userId)
          }
        })
        .select({
          roles: true
        });
    return userRoles.include('ADMIN')
  })
}

export const permissions = shield({
  Query: {
    me: rules.isAuthenticatedUser,
    draftsByUser: rules.isAuthenticatedUser,
    postById: rules.isAuthenticatedUser,
    allVideoGames: rules.isAuthenticatedUser,
    videoGameById: rules.isAuthenticatedUser,
    videoGamesByUser: rules.isAuthenticatedUser
  },
  Mutation: {
    createDraft: rules.isAuthenticatedUser,
    deletePost: rules.isPostOwner,
    incrementPostViewCount: rules.isAuthenticatedUser,
    togglePublishPost: rules.isPostOwner,
    createVideoGame: rules.isAuthenticatedUser,
    togglePublishVideoGame: and(rules.isAuthenticatedUser, rules.isAdmin),
    deleteVideoGame: and(rules.isAuthenticatedUser, or(rules.isAdmin, rules.isVideoGameOwner))
  },
})
