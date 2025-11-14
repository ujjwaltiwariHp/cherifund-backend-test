import { httpStatus } from "../../config/httpStatus.js"
import { prisma } from "../../database/db.js"
import { categoryError } from "../../errors/category.js"
import { errorHandler } from "../../util/errorHandler.js"
import { pickLanguage } from "../../util/languageHelper.js"
import { logError } from "../../util/logHelper.js"

//! create category
export const createCategory = async (req, res, next) =>{
    let {name} = req.body
    try {

        name = typeof name == "string" ? JSON.parse(name) : name
        if(!name)
            return next(errorHandler(categoryError.Name_Required))

        const existingCategory = await prisma.category.findFirst({
            where : {
                OR : [
                    {name : {path : ['en'], equals : name.en}},
                    {name : {path : ['hi'], equals : name.hi}}
                ]
            }
        })
        if(existingCategory)
            return next(errorHandler(categoryError.Already_Exists))

        const category = await prisma.category.create({
            data : {
                name
            }
        })

        res.status(httpStatus.CREATED).json({
            msg : "Category created successfully",
            category : category.name
        })
    } catch (error) {
        logError("Error in create category", error)
        next(error)
    }
}

//! update category
export const updateCategory = async (req, res, next) =>{
    const {categoryId} = req.params
    let {name} = req.body
    try {
        name = typeof name == "string" ? JSON.parse(name) : name

        if(!name)
            return next(errorHandler(categoryError.Name_Required))

        const existingCategory = await prisma.category.findUnique({
            where : {
                id : categoryId
            }
        })
        if(!existingCategory)
            return next(errorHandler(categoryError.Not_Exists))

        const duplicateCategory = await prisma.category.findFirst({
            where: {
                id: { not: categoryId },
                OR: [
                    { name: { path: ['en'], equals: name.en } },
                    { name: { path: ['hi'], equals: name.hi } }
                ]
            }
        });
        if (duplicateCategory)
            return next(errorHandler(categoryError.Already_Exists));

        const category = await prisma.category.update({
            where : {
                id : categoryId
            },
            data : {
                name
            }
        })

        res.status(httpStatus.OK).json({
            msg : "Category Updated Successfully",
            category : category.name
        })
    } catch (error) {
        logError("Error in update category")

    }
}

//! get all category
export const getCategories = async (req, res, next) =>{
    const {page = 1, limit, name} = req.query
    const lang = req.lang
    try {
        const pageNumber = parseInt(page)

        let whereCondition = {}

        if(name && name.trim() != ""){
            whereCondition = {
                OR : [
                    {name : {path : ['en'], string_contains : name, mode : "insensitive"}},
                    {name : {path : ['hi'], string_contains : name, mode : "insensitive"}}
                ]
            }
        }

        let category, totalCategory

        if(limit){
        const limitNumber = parseInt(limit)
        const skip = (pageNumber - 1) * limitNumber

        const totalCategory = await prisma.category.count({where : whereCondition})

        const categories = await prisma.category.findMany({
            where : whereCondition,
            skip,
            take : limitNumber,
            orderBy : {
                createdAt : "desc"
            }
        })


        category = categories.map(c =>{

            const isHindiMatch = c.name?.hi?.includes(name)  
             const FinalLang =name ?  isHindiMatch ? "hi" : "en" : lang;               

            return {
            id : c.id,
            name : pickLanguage(c.name, FinalLang),
            createdAt : c.createdAt
        }})

        res.status(httpStatus.OK).json({
            total : totalCategory,
            page : pageNumber,
            limit : limitNumber,
            totalPages : Math.ceil(totalCategory / limitNumber),
            category
        })        
    }
    else{
       const categories = await prisma.category.findMany({
            orderBy : {
                createdAt : "desc"
            }
        })

        totalCategory = categories.length

        category = categories.map(c => ({
            id : c.id,
            name : c.name,
            createdAt : c.createdAt
        }))

        res.status(httpStatus.OK).json({
            total: totalCategory,
            category
        })
    }
    } catch (error) {
        logError("Error in get category", error)
        next(error)
    }
}

//! delete category
export const deleteCategory = async (req, res, next) =>{
    const {categoryId} = req.params
    try {
        const existingCategory = await prisma.category.findUnique({
            where : {
                id : categoryId
            }
        })
        if(!existingCategory)
            return next(errorHandler(categoryError.Not_Exists))

        const campaignCount = await prisma.campaigns.count({
            where : {
                categoryId
            }
        })

        if(campaignCount > 0) 
            return next(errorHandler(categoryError.Delete_Not_Allowed))

        const blogCount = await prisma.blog.count({
            where : {
                categoryId
            }
        })

        if(blogCount > 0)
            return next(errorHandler(categoryError.Delete_Not_Allowed))

        await prisma.category.delete({
            where : {
                id : categoryId
            }
        })

        res.status(httpStatus.OK).json({
            msg : "Category deleted successfully"
        })
    } catch (error) {
        logError("Error in delete Category", error)
        next(error)
    }
}

//! get category by Id
export const getCategoryById = async (req, res, next) =>{
    const {categoryId} = req.params
    try {
        const existingCategory = await prisma.category.findUnique({
            where : {id : categoryId}
        })
        if(!existingCategory) return next(errorHandler(categoryError.Not_Exists))

            res.status(httpStatus.OK).json(existingCategory)
    } catch (error) {
        logError("Error in get category by Id", error)
        next(error)
    }
}