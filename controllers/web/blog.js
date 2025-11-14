import { httpStatus } from "../../config/httpStatus.js"
import { prisma } from "../../database/db.js"
import { blogError } from "../../errors/blog.js"
import { errorHandler } from "../../util/errorHandler.js"
import { logError } from "../../util/logHelper.js"
import { pickLanguage } from "../../util/languageHelper.js"


//! get all blog
export const getAllBlog = async (req, res, next) =>{
    const {page = 1, limit = 10, search} = req.query
    const lang = req.lang
    try {
        const pageNumber = parseInt(page)
        const limitNumber = parseInt(limit)
        const skip = (pageNumber - 1) * limitNumber

        let whereCondition = {}

        if(search && search.trim() !== "" && search != "All"){
            whereCondition = {
        OR: [
            //! english
          { title: { path: ["en"], string_contains: search, mode: "insensitive" } },
        { keyPoints: { path: ["en"], array_contains: [search] } },
        {creator : {path : ['en'], array_contains : [search] }},
        {tags : {path : ['en'], array_contains : [search] }},
           //! hindi
        { title: { path: ["hi"], string_contains: search, mode: "insensitive" } },
        { keyPoints: { path: ["hi"], array_contains: [search] } },
        {creator : {path : ['hi'], array_contains : [search] }},
        {tags : {path : ['hi'], array_contains : [search] }}
        ],
      };
        }

        //! total blog
        const totalBlogs = await prisma.blog.count({where : whereCondition})

        const blogs = await prisma.blog.findMany({
            where : whereCondition,
            skip,
            take : limitNumber,
            orderBy : {
                createdAt : "desc"
            },
            include : {
                category : true,
                _count : {
                    select : {comments : true}
                }
            }
        })

        const formatted = blogs.map(blog => {

            const isHindiMatch = blog.title?.hi?.includes(search) || 
                            (Array.isArray(blog.keyPoints?.hi) && blog.keyPoints.hi.some((k) => k.includes(search))) ||
                            blog.creator?.hi?.includes(search) || 
                            (Array.isArray(blog.tags?.hi) && blog.tags.hi.some((k) => k.includes(search)))


        let FinalLang = search ? (isHindiMatch ? "hi" : "en") : lang            

        if(search == "All"){
            FinalLang = lang
        }

        return {
            id : blog.id,
            creator :  pickLanguage(blog.creator,FinalLang),
            title : pickLanguage(blog.title, FinalLang),
            category : pickLanguage(blog.category.name, FinalLang),
            description : pickLanguage(blog.description, FinalLang),
            summary : pickLanguage(blog.summary, FinalLang),
            images : blog.imageUrl.images.map(img => img.url), 
            quote : pickLanguage(blog.quote, FinalLang),
            quoteAuthor : pickLanguage(blog.quoteAuthor,FinalLang),            
            tags : pickLanguage(blog.tags,FinalLang),
            keyPoints : pickLanguage(blog.keyPoints, FinalLang),
            location : pickLanguage(blog.location, FinalLang),
            commentCount : blog._count.comments,
            createdAt : blog.createdAt
        }
    })
     

        res.status(httpStatus.OK).json({
            total : totalBlogs,
            page : pageNumber,
            limit : limitNumber,
            totalPages : Math.ceil(totalBlogs / limitNumber),
            blogs : formatted
        })

    } catch (error) {
        logError("Error in get all blog", error)
        next(error)
    }
}

//! get blog by Id
export const getBlogById = async (req, res, next) =>{
    const {blogId} = req.params
    const lang = req.lang
    try {
        const existingBlog = await prisma.blog.findUnique({
            where : {
                id : blogId
            },
            include : {
                category : true
            }
        })
        if(!existingBlog)
            return next(errorHandler(blogError.Blog_Not_Exists))

        const formatted = {
            id : existingBlog.id,
            creator : pickLanguage(existingBlog.creator, lang),
            title : pickLanguage(existingBlog.title, lang),
            category : pickLanguage(existingBlog.category.name, lang),
            description : pickLanguage(existingBlog.description, lang),
            summary : pickLanguage(existingBlog.summary, lang),
            quote : pickLanguage(existingBlog.quote, lang),
            quoteAuthor : pickLanguage(existingBlog.quoteAuthor, lang),
            tags : pickLanguage(existingBlog.tags, lang),
            keyPoints : pickLanguage(existingBlog.keyPoints,lang),
            location : pickLanguage(existingBlog.location, lang),
            images : existingBlog.imageUrl.images.map(img => img.url),
            createdAt : existingBlog.createdAt
        }

        res.status(httpStatus.OK).json(formatted)
    } catch (error) {
        logError("Erron in get blog by Id", error)
        next(error)
    }
}