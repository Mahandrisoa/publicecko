import { permissions } from './permissions'
import { APP_SECRET, getUserId } from './utils'
import { compare, hash } from 'bcryptjs'
import { sign } from 'jsonwebtoken'
import { applyMiddleware } from 'graphql-middleware'
import {
  intArg,
  makeSchema,
  nonNull,
  objectType,
  stringArg,
  inputObjectType,
  arg,
  asNexusMethod,
  enumType,
} from 'nexus'
import { DateTimeResolver } from 'graphql-scalars'
import { Context } from './context'

export const DateTime = asNexusMethod(DateTimeResolver, 'date')

const Query = objectType({
  name: 'Query',
  definition(t) {
    t.nonNull.list.nonNull.field('allUsers', {
      type: 'User',
      resolve: (_parent, _args, context: Context) => {
        return context.prisma.user.findMany()
      },
    })

    t.nullable.field('me', {
      type: 'User',
      resolve: (parent, args, context: Context) => {
        const userId = getUserId(context)
        return context.prisma.user.findUnique({
          where: {
            id: Number(userId),
          },
        })
      },
    })

    t.nullable.field('postById', {
      type: 'Post',
      args: {
        id: intArg(),
      },
      resolve: (_parent, args, context: Context) => {
        return context.prisma.post.findUnique({
          where: { id: args.id || undefined },
        })
      },
    })

    t.nonNull.list.nonNull.field('feed', {
      type: 'Post',
      args: {
        searchString: stringArg(),
        skip: intArg(),
        take: intArg(),
        orderBy: arg({
          type: 'PostOrderByUpdatedAtInput',
        }),
      },
      resolve: (_parent, args, context: Context) => {
        const or = args.searchString
          ? {
              OR: [
                { title: { contains: args.searchString } },
                { content: { contains: args.searchString } },
              ],
            }
          : {}

        return context.prisma.post.findMany({
          where: {
            published: true,
            ...or,
          },
          take: args.take || undefined,
          skip: args.skip || undefined,
          orderBy: args.orderBy || undefined,
        })
      },
    })

    t.list.field('draftsByUser', {
      type: 'Post',
      args: {
        userUniqueInput: nonNull(
          arg({
            type: 'UserUniqueInput',
          }),
        ),
      },
      resolve: (_parent, args, context: Context) => {
        return context.prisma.user
          .findUnique({
            where: {
              id: args.userUniqueInput.id || undefined,
              email: args.userUniqueInput.email || undefined,
            },
          })
          .posts({
            where: {
              published: false,
            },
          })
      },
    })

    t.nonNull.list.nonNull.field('allVideoGames', {
      type: 'VideoGame',
      resolve: async (_parent, args, context: Context) => {
        return context.prisma.videoGame.findMany()
      }
    })


    t.nullable.field('videoGameById', {
      type: 'VideoGame',
      args: {
        id: intArg()
      },
      resolve: (_parent, args, context: Context) => {
        return context.prisma.videoGame.findUnique({
          where: { id: args.id || undefined }
        })
      }
    })

    t.nonNull.list.nonNull.field('videoGamesByUser', {
      type: 'VideoGame',
      args: {
        userUniqueInput: nonNull(
            arg({
              type: 'UserUniqueInput',
            }),
        )
      },
      resolve: (_parent, args, context: Context) => {
        return context.prisma.user
            .findUnique({
              where: {
                id: args.userUniqueInput.id || undefined,
                email: args.userUniqueInput.email || undefined,
              },
            })
            .videoGame({
              where: {
                published: false,
              },
            })
      }
    })

    t.nonNull.list.nonNull.field('allAnnonces', {
      type: 'Annonce',
      // @ts-ignore
      resolve: (_parent, args, context: Context) => {
        return context.prisma.annonce.findMany()
      }
    })

    t.nullable.field('annonceById', {
      type: 'Annonce',
      args: {
        id: intArg()
      },
      // @ts-ignore
      resolve: (_parent, args, context: Context) => {
        return context.prisma.annonce.findUnique({
          where: { id: args.id || undefined }
        })
      }
    })

    t.nonNull.list.nonNull.field('annonceByUser', {
      type: 'Annonce',
      args: {
        userUniqueInput: nonNull(
            arg({
              type: 'UserUniqueInput',
            }),
        )
      },
      // @ts-ignore
      resolve: (_parent, args, context: Context) => {
        return context.prisma.user
            .findUnique({
              where: {
                id: args.userUniqueInput.id || undefined,
                email: args.userUniqueInput.email || undefined,
              },
            })
            .annonce({
              where: {
                published: false,
              },
            })
      }
    })
  },
})

const Mutation = objectType({
  name: 'Mutation',
  definition(t) {
    t.field('signup', {
      type: 'AuthPayload',
      args: {
        name: stringArg(),
        email: nonNull(stringArg()),
        password: nonNull(stringArg()),
      },
      resolve: async (_parent, args, context: Context) => {
        const hashedPassword = await hash(args.password, 10)
        const user = await context.prisma.user.create({
          data: {
            name: args.name,
            email: args.email,
            password: hashedPassword,
          },
        })
        return {
          token: sign({ userId: user.id }, APP_SECRET),
          user,
        }
      },
    })

    t.field('login', {
      type: 'AuthPayload',
      args: {
        email: nonNull(stringArg()),
        password: nonNull(stringArg()),
      },
      resolve: async (_parent, { email, password }, context: Context) => {
        const user = await context.prisma.user.findUnique({
          where: {
            email,
          },
        })
        if (!user) {
          throw new Error(`No user found for email: ${email}`)
        }
        const passwordValid = await compare(password, user.password)
        if (!passwordValid) {
          throw new Error('Invalid password')
        }
        return {
          token: sign({ userId: user.id }, APP_SECRET),
          user,
        }
      },
    })

    t.field('createDraft', {
      type: 'Post',
      args: {
        data: nonNull(
          arg({
            type: 'PostCreateInput',
          }),
        ),
      },
      resolve: (_, args, context: Context) => {
        const userId = getUserId(context)
        return context.prisma.post.create({
          data: {
            title: args.data.title,
            content: args.data.content,
            authorId: userId,
          },
        })
      },
    })

    t.field('togglePublishPost', {
      type: 'Post',
      args: {
        id: nonNull(intArg()),
      },
      resolve: async (_, args, context: Context) => {
        try {
          const post = await context.prisma.post.findUnique({
            where: { id: args.id || undefined },
            select: {
              published: true,
            },
          })
          return context.prisma.post.update({
            where: { id: args.id || undefined },
            data: { published: !post?.published },
          })
        } catch (e) {
          throw new Error(
            `Post with ID ${args.id} does not exist in the database.`,
          )
        }
      },
    })

    t.field('incrementPostViewCount', {
      type: 'Post',
      args: {
        id: nonNull(intArg()),
      },
      resolve: (_, args, context: Context) => {
        return context.prisma.post.update({
          where: { id: args.id || undefined },
          data: {
            viewCount: {
              increment: 1,
            },
          },
        })
      },
    })

    t.field('deletePost', {
      type: 'Post',
      args: {
        id: nonNull(intArg()),
      },
      resolve: (_, args, context: Context) => {
        return context.prisma.post.delete({
          where: { id: args.id },
        })
      },
    })

    // Video Game
    t.field('createVideoGame', {
      type: 'VideoGame',
      args: {
        data: nonNull(
            arg({
              type: 'VideoGameCreateInput',
            }),
        ),
      },
      resolve: (_, args, context: Context) => {
        const userId = getUserId(context)
        return context.prisma.videoGame.create({
          data: {
            title: args.data.title,
            description: args.data.description,
            release_date: args.data.release_date,
            authorId: userId,
            categories: args.data.categories
          },
        })
      },
    })

    t.field('togglePublishVideoGame', {
      type: 'VideoGame',
      args: {
        id: nonNull(intArg()),
      },
      resolve: async (_, args, context: Context) => {
        try {
          const videoGame = await context.prisma.videoGame.findUnique({
            where: { id: args.id || undefined },
            select: {
              published: true,
            },
          })
          return context.prisma.videoGame.update({
            where: { id: args.id || undefined },
            data: { published: !videoGame?.published },
          })
        } catch (e) {
          throw new Error(
              `videoGame with ID ${args.id} does not exist in the database.`,
          )
        }
      },
    })

    t.field('deleteVideoGame', {
      type: 'VideoGame',
      args: {
        id: nonNull(intArg()),
      },
      resolve: (_, args, context: Context) => {
        return context.prisma.videoGame.delete({
          where: { id: args.id },
        })
      },
    })

    // Annonce
    t.field('createAnnonce', {
      type: 'Annonce',
      args: {
        data: nonNull(
            arg({
              type: 'AnnonceCreateInput',
            }),
        ),
      },
      // @ts-ignore
      resolve: (_, args, context: Context) => {
        const userId = getUserId(context)
        return context.prisma.annonce.create({
          data: {
            title: args.data.title,
            description: args.data.description,
            authorId: userId,
            categories: args.data.categories,
            ...(args.data.ratings) && {ratings: args.data.ratings} ,
          },
        })
      },
    })

    t.field('togglePublishAnnonce', {
      type: 'Annonce',
      args: {
        id: nonNull(intArg()),
      },
      // @ts-ignore
      resolve: async (_, args, context: Context) => {
        try {
          const annonce = await context.prisma.annonce.findUnique({
            where: { id: args.id || undefined },
            select: {
              published: true,
            },
          })
          return context.prisma.annonce.update({
            where: { id: args.id || undefined },
            data: { published: !annonce?.published },
          })
        } catch (e) {
          throw new Error(
              `Annonce with ID ${args.id} does not exist in the database.`,
          )
        }
      },
    })

    t.field('deleteAnnonce', {
      type: 'Annonce',
      args: {
        id: nonNull(intArg()),
      },
      // @ts-ignore
      resolve: (_, args, context: Context) => {
        return context.prisma.annonce.delete({
          where: { id: args.id },
        })
      },
    })
  },
})

const User = objectType({
  name: 'User',
  definition(t) {
    t.nonNull.int('id')
    t.string('name')
    t.nonNull.string('email')
    t.nonNull.list.nonNull.field('posts', {
      type: 'Post',
      resolve: (parent, _, context: Context) => {
        return context.prisma.user
          .findUnique({
            where: { id: parent.id || undefined },
          })
          .posts()
      },
    })
    t.nonNull.list.nonNull.field('videoGames', {
      type: 'VideoGame',
      resolve: (parent, _, context: Context) => {
        return context.prisma.user
            .findUnique({
              where: {id: parent.id || undefined},
            })
            .videoGame()
      }
    })
    t.nonNull.list.nonNull.string('roles')
  },
})

const Post = objectType({
  name: 'Post',
  definition(t) {
    t.nonNull.int('id')
    t.nonNull.field('createdAt', { type: 'DateTime' })
    t.nonNull.field('updatedAt', { type: 'DateTime' })
    t.nonNull.string('title')
    t.string('content')
    t.nonNull.boolean('published')
    t.nonNull.int('viewCount')
    t.field('author', {
      type: 'User',
      resolve: (parent, _, context: Context) => {
        return context.prisma.post
          .findUnique({
            where: { id: parent.id || undefined },
          })
          .author()
      },
    })
  },
})

const Annonce = objectType({
  name: 'Annonce',
  definition(t) {
    t.nonNull.int('id')
    t.nonNull.string('title')
    t.string('description')
    t.nonNull.boolean('published')
    t.field('author', {
      type: 'User',
      resolve: (parent, _, context: Context) => {
        return context.prisma.annonce
            .findUnique({
              where: { id: parent.id || undefined },
            })
            .author()
      },
    })
    t.nonNull.int('ratings')
    t.nonNull.field('createdAt', { type: 'DateTime' })
    t.nonNull.field('updatedAt', { type: 'DateTime' })
    t.nonNull.list.nonNull.string('categories')
  }
})

const VideoGame = objectType({
  name: 'VideoGame',
  definition(t) {
    t.nonNull.int('id')
    t.nonNull.string('title')
    t.string('description')
    t.nonNull.boolean('published')
    t.field('author', {
      type: 'User',
      resolve: (parent, _, context: Context) => {
        return context.prisma.videoGame
            .findUnique({
              where: { id: parent.id || undefined },
            })
            .author()
      },
    })
    t.field('release_date', { type: 'DateTime'})
    t.nonNull.list.nonNull.string('categories')
  }
})

const SortOrder = enumType({
  name: 'SortOrder',
  members: ['asc', 'desc'],
})

const PostOrderByUpdatedAtInput = inputObjectType({
  name: 'PostOrderByUpdatedAtInput',
  definition(t) {
    t.nonNull.field('updatedAt', { type: 'SortOrder' })
  },
})

const UserUniqueInput = inputObjectType({
  name: 'UserUniqueInput',
  definition(t) {
    t.int('id')
    t.string('email')
  },
})

const PostCreateInput = inputObjectType({
  name: 'PostCreateInput',
  definition(t) {
    t.nonNull.string('title')
    t.string('content')
  },
})

const UserCreateInput = inputObjectType({
  name: 'UserCreateInput',
  definition(t) {
    t.nonNull.string('email')
    t.string('name')
    t.list.nonNull.field('posts', { type: 'PostCreateInput' })
  },
})

const VideoGameCreateInput = inputObjectType({
  name: 'VideoGameCreateInput',
  definition(t) {
    t.nonNull.string('title')
    t.string('description')
    t.date('release_date')
    t.nonNull.list.nonNull.string('categories')
  }
})

const AnnonceCreateInput = inputObjectType({
  name: 'AnnonceCreateInput',
  definition(t) {
    t.nonNull.string('title')
    t.string('description')
    t.int('ratings')
    t.nonNull.list.nonNull.string('categories')
  }
})

const AuthPayload = objectType({
  name: 'AuthPayload',
  definition(t) {
    t.string('token')
    t.field('user', { type: 'User' })
  },
})

const schemaWithoutPermissions = makeSchema({
  types: [
    Query,
    Mutation,
    Post,
    User,
    VideoGame,
    Annonce,
    AuthPayload,
    UserUniqueInput,
    UserCreateInput,
    PostCreateInput,
    VideoGameCreateInput,
    AnnonceCreateInput,
    SortOrder,
    PostOrderByUpdatedAtInput,
    DateTime,
  ],
  outputs: {
    schema: __dirname + '/../schema.graphql',
    typegen: __dirname + '/generated/nexus.ts',
  },
  contextType: {
    module: require.resolve('./context'),
    export: 'Context',
  },
  sourceTypes: {
    modules: [
      {
        module: '@prisma/client',
        alias: 'prisma',
      },
    ],
  },
})

export const schema = applyMiddleware(schemaWithoutPermissions, permissions)
