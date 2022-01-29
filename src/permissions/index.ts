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
  isAnnonceOwner: rule()(async (_parent, args, context) => {
    const userId = getUserId(context)
    const author = await context.prisma.annonce
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
    const {roles} = await context.prisma.user
        .findUnique({
          where: {
            id: Number(userId)
          }
        })

    return roles.includes('ADMIN')
  })
}

export const permissions = shield({
  Query: {
    me: rules.isAuthenticatedUser,
    draftsByUser: rules.isAuthenticatedUser,
    postById: rules.isAuthenticatedUser,
    allVideoGames: and(rules.isAuthenticatedUser, rules.isAdmin),
    videoGameById: and(rules.isAuthenticatedUser, or(rules.isAdmin, rules.isVideoGameOwner)),
    videoGamesByUser: and(rules.isAuthenticatedUser, or(rules.isAdmin, rules.isVideoGameOwner)),
    allAnnonces: and(rules.isAuthenticatedUser, rules.isAdmin),
    annonceById: and(rules.isAuthenticatedUser, or(rules.isAdmin, rules.isAnnonceOwner)),
    annonceByUser: and(rules.isAuthenticatedUser, or(rules.isAdmin, rules.isAnnonceOwner))
  },
  Mutation: {
    createDraft: rules.isAuthenticatedUser,
    deletePost: and(rules.isAuthenticatedUser, or(rules.isPostOwner, rules.isAdmin)),
    incrementPostViewCount: rules.isAuthenticatedUser,
    togglePublishPost: and(rules.isAuthenticatedUser, rules.isAdmin),
    createVideoGame: rules.isAuthenticatedUser,
    togglePublishVideoGame: and(rules.isAuthenticatedUser, rules.isAdmin),
    deleteVideoGame: and(rules.isAuthenticatedUser, or(rules.isAdmin, rules.isVideoGameOwner)),
    createAnnonce: rules.isAuthenticatedUser,
    togglePublishAnnonce: and(rules.isAuthenticatedUser, rules.isAdmin),
    deleteAnnonce: and(rules.isAuthenticatedUser, or(rules.isAdmin, rules.isAnnonceOwner))
  },
})
