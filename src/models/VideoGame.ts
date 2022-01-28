import {objectType} from "nexus";
import {Context} from "../context";

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
        t.nonNull.field('release_date', { type: 'DateTime'})
        t.nonNull.string('type')
    }
})

export { VideoGame }
