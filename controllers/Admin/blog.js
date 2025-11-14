import { httpStatus } from "../../config/httpStatus.js"
import { prisma } from "../../database/db.js"
import { blogError } from "../../errors/blog.js"
import { categoryError } from "../../errors/category.js"
import uploadToCloudinary, { deleteFromCloudinary } from "../../util/cloudinary.js"
import { errorHandler } from "../../util/errorHandler.js"
import { logError } from "../../util/logHelper.js"
import { pickLanguage } from "../../util/languageHelper.js"

//! create blog
export const createBlog = async (req, res, next) =>{
    let {creator, title, description, summary, quote, quoteAuthor, category, tags = [], keyPoints = [] , location} = req.body
    try {
         // Parse JSON fields if sent as string (form-data)
        creator = typeof creator === "string" ? JSON.parse(creator) : creator;
        title = typeof title === "string" ? JSON.parse(title) : title;
        description = typeof description === "string" ? JSON.parse(description) : description;
        summary = typeof summary === "string" ? JSON.parse(summary) : summary;
        quote = typeof quote === "string" ? JSON.parse(quote) : quote;
        quoteAuthor = typeof quoteAuthor === "string" ? JSON.parse(quoteAuthor) : quoteAuthor;
        category = typeof category === "string" ? JSON.parse(category) : category
        location = typeof location === "string" ? JSON.parse(location) : location

        const parsedKeyPoints = Array.isArray(keyPoints) ? keyPoints : keyPoints ?   JSON.parse(keyPoints) : []
        const parsedTags = Array.isArray(tags) ? tags : tags ? JSON.parse(tags) : []

        if(!creator || !title || !description || !summary || !category || parsedKeyPoints.length == 0 || !location || !quote || !quoteAuthor)
            return next(errorHandler(blogError.Required_Fields))

        const existingCategory = await prisma.category.findFirst({
            where :  {
                AND : [
                    {name : {path : ['en'], equals : category.en}},
                    {name : {path : ['hi'], equals : category.hi}}
                ]
            }
        })

        if(!existingCategory)
            return next(errorHandler(categoryError.Not_There))

        let images = []
        if(req.files && req.files.length > 0) {
            for(const file of req.files){
                const result = await uploadToCloudinary(file.path, "Blogs", next)
                images.push({
                    url : result.secure_url,
                    public_id : result.public_id
                })
            }
        }

        const blog = await prisma.blog.create({
            data : {
                creator,
                title,
                description,
                summary,
                quote,
                quoteAuthor,
                categoryId: existingCategory.id,
                tags : parsedTags,
                keyPoints : parsedKeyPoints,
                location,
                imageUrl : {images}
            },
            include : {
                category : true
            }
        })

        res.status(httpStatus.OK).json({
            msg : "Blog created successfully",
            blog
        })
    } catch (error) {
        logError("Error in create blog", error)
        next(error)
    }
}

//! get all blog
export const getAllBlog = async (req, res, next) =>{
    const {page = 1, limit = 10, title, creator, location, category} = req.query
    const lang = req.lang
    try {
        const pageNumber = parseInt(page)
        const limitNumber = parseInt(limit)
        const skip = (pageNumber - 1) * limitNumber

        let whereCondition = {}

    if(category && category.trim() != ""){
        const matchedCategory = await prisma.category.findFirst({
            where : {
                OR : [
                    {name : {path : ['en'], string_contains : category, mode : "insensitive"}},
                    {name : {path : ['hi'], string_contains : category, mode: "insensitive"}}
                ]
            }
        })
        if(matchedCategory){
            whereCondition = {
                categoryId : matchedCategory.id
            }
        }else {
            return res.status(httpStatus.OK).json({
                total: 0,
                page: pageNumber,
                limit: limitNumber,
                totalPages: 0,
                blogs: [],
            })
        }
    }

    else if(title && title.trim() != ""){
        whereCondition = {
            OR : [
                {title : {path : ['en'], string_contains : title, mode : "insensitive"}},
                {title : {path : ['hi'], string_contains : title, mode : "insensitive"}}
            ]
        }
    }

    else if(creator && creator.trim() != ""){
        whereCondition = {
            OR : [
                {creator : { path : ['en'], string_contains : creator, mode : "insensitive"}},
                {creator : {path : ['hi'], string_contains : creator, mode : "insensitive"}}
            ]
        }
    }

    else if(location && location.trim() != ""){
        whereCondition = {
            OR : [
                {location : {path : ['en'], string_contains : location, mode : "insensitive"}},
                {location : {path : ['hi'], string_contains : location, mode : "insensitive"}}
            ]
        }
    }
    else{
        whereCondition = {}
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

            const isHindiMatch = blog.title?.hi?.includes(title) || 
                            blog.location?.hi?.includes(location) ||
                            blog.creator?.hi?.includes(creator) || 
                            blog.category?.name?.hi?.includes(category);


        const FinalLang = (title || location || creator || category) ? (isHindiMatch ? "hi" : "en") : lang            

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
            createdAt : blog.createdAt,
            updatedAt : blog.updatedAt
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
    try {
        const existingBlog = await prisma.blog.findUnique({
            where : {
                id : blogId
            },
            include : {
                category : true
            }
        })

            const formatted = {
            id : existingBlog.id,
            creator : existingBlog.creator,
            title : existingBlog.title,
            category : existingBlog.category.name,
            description : existingBlog.description,
            summary : existingBlog.summary,
            quote : existingBlog.quote,
            quoteAuthor : existingBlog.quoteAuthor,
            tags : existingBlog.tags,
            keyPoints : existingBlog.keyPoints,
            location : existingBlog.location,
            images : existingBlog.imageUrl.images.map(img => img.url),
            createdAt : existingBlog.createdAt
        }
        
        if(!existingBlog)
            return next(errorHandler(blogError.Blog_Not_Exists))

        res.status(httpStatus.OK).json(formatted)
    } catch (error) {
        logError("Erron in get blog by Id", error)
        next(error)
    }
}

//! update blog
export const updateBlog = async (req, res, next) =>{
    const {blogId} = req.params
    let {creator, title, category, description, summary, quote, quoteAuthor, tags = [], keyPoints = [], location, existingImages = []} = req.body
    try {
        const existingBlog = await prisma.blog.findUnique({
            where : {
                id : blogId
            }
        })        
        if(!existingBlog)
            return next(errorHandler(blogError.Blog_Not_Exists))

        let imageObj = existingBlog.imageUrl || {images : []}

        const keptImages = []
        const toDelete = []

        //! delete unwanted image from db
        for (const img of imageObj.images){
            if(existingImages.includes(img.url)){
                keptImages.push(img)
            }
            else {
                toDelete.push(img)
            }
        }

        //! deleted unwanted images from cloudinary
        for(const img of toDelete){
            await deleteFromCloudinary(img.public_id, next)
        }

        if(req.files && req.files.length > 0){
            for(const file of req.files){
                const result = await uploadToCloudinary(file.path, "Blogs", next)
                keptImages.push({
                    url : result.secure_url,
                    public_id : result.public_id
                })
            }
        }

        imageObj = {images : keptImages}

        // Parse JSON fields if sent as string
        creator = typeof creator === "string" ? JSON.parse(creator) : creator;
        title = typeof title === "string" ? JSON.parse(title) : title;
        description = typeof description === "string" ? JSON.parse(description) : description;
        summary = typeof summary === "string" ? JSON.parse(summary) : summary;
        quote = typeof quote === "string" ? JSON.parse(quote) : quote;
        quoteAuthor = typeof quoteAuthor === "string" ? JSON.parse(quoteAuthor) : quoteAuthor;
        category = typeof category === "string" ? JSON.parse(category) : category
        location = typeof location === "string" ? JSON.parse(location) : location

        let parsedKeyPoints = Array.isArray(keyPoints)
          ? (keyPoints.length > 0 ? keyPoints : existingBlog.keyPoints)
          : (keyPoints ? JSON.parse(keyPoints) || existingBlog.keyPoints : existingBlog.keyPoints);
        
          let parsedTags = Array.isArray(tags)
          ? (tags.length > 0 ? tags : existingBlog.tags)
          : (tags ? JSON.parse(tags) || existingBlog.tags : existingBlog.tags);

        
        //! handle category update
        let categoryId = existingBlog.categoryId
        if(category){
            const existingCategory = await prisma.category.findFirst({
                where : {
                    AND : [
                        {name : {path : ['en'], equals : category.en}},
                        {name : {path : ['hi'], equals : category.hi}}
                    ]
                }
            })
            if(!existingCategory)
                return next(errorHandler(categoryError.Not_There))

            categoryId = existingCategory.id
        }

        await prisma.blog.update({
            where : {
                id : blogId
            },
            data : {
                creator : creator ?? existingBlog.creator, 
                title : title ?? existingBlog.title,
                categoryId,
                description : description ?? existingBlog.description,
                summary : summary ?? existingBlog.summary,
                quote : quote ?? existingBlog.quote,
                quoteAuthor : quoteAuthor ?? existingBlog.quoteAuthor,
                tags : parsedTags,
                keyPoints : parsedKeyPoints,
                imageUrl : imageObj,
                location : location ?? existingBlog.location
            }
        })

        res.status(httpStatus.OK).json({
            msg : "Blog updated successfully"
        })

    } catch (error) {
        logError("Error in update blog", error)
        next(error)
    }
}

//! delete blog
export const deleteBlog = async (req, res, next) =>{
    const {blogId} = req.params
    try {
        const existingBlog = await prisma.blog.findUnique({
            where : {
                id : blogId
            }
        })

        if(!existingBlog)
            return next(errorHandler(blogError.Blog_Not_Exists))

        //! delete images from cloudinary
        const imageObj = existingBlog.imageUrl || {images : []}
        if(imageObj.images && imageObj.images.length > 0){
            for (const img of imageObj.images){
                await deleteFromCloudinary(img.public_id, next)
            }
        }

        await prisma.blog.delete({
            where : {
                id : blogId
            }
        })

        res.status(httpStatus.OK).json({
            msg : "Blog deleted successfully"
        })
    } catch (error) {
        logError("Error in delete blog", error)
        next(error)
    }
}