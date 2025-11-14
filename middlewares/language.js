import { logError } from "../util/logHelper.js"

export const language = async (req, res, next) =>{
    try {
        const lang = req.headers["accept-language"]?.split(",")[0]?.split("-")[0] || "en"

        req.lang = lang
        next()
    } catch (error) {
        logError("Error in language middleware", error)        
        next(error)
    }
}