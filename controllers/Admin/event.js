import { httpStatus } from "../../config/httpStatus.js"
import { prisma } from "../../database/db.js"
import { eventError } from "../../errors/event.js"
import uploadToCloudinary, { deleteFromCloudinary } from "../../util/cloudinary.js"
import { errorHandler } from "../../util/errorHandler.js"
import { pickLanguage } from "../../util/languageHelper.js"
import { logError } from "../../util/logHelper.js"
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
dayjs.extend(utc);
dayjs.extend(timezone);

//! add event
export const addEvent = async (req, res, next) =>{
    const {title, description, summary, keyPoints = [], location, latitude, longitude, startTime, endTime} = req.body
    try {
        const parsedTitle = typeof title === "string" ? JSON.parse(title) : title;
    const parsedDescription = typeof description === "string" ? JSON.parse(description) : description;
    const parsedSummary = typeof summary === "string" ? JSON.parse(summary) : summary;
    const parsedLocation = typeof location === "string" ? JSON.parse(location) : location;
        const parsedKeyPoints = Array.isArray(keyPoints) ? keyPoints : keyPoints ?   JSON.parse(keyPoints) : []   

        if(!title || !description || !summary || parsedKeyPoints.length == 0 || !location || !latitude || !longitude || !startTime || !endTime)
            return next(errorHandler(eventError.Required_Fields))

        if(req.files.length == 0)
            return next(errorHandler(eventError.Image_Required))

        let images = []
        if(req.files && req.files.length > 0){
            for(const file of req.files){
                const result = await uploadToCloudinary(file.path, "Events", next)
                images.push({
                    url : result.secure_url,
                    public_id : result.public_id
                })
            }
        }

        const latitudeNumber = parseFloat(latitude)
        const longitudeNumber = parseFloat(longitude)

//         const startTimeUTC = dayjs.tz(startTime, "Asia/Kolkata").toDate();
// const endTimeUTC = dayjs.tz(endTime, "Asia/Kolkata").toDate();

        const event = await prisma.event.create({
            data : {
                title : parsedTitle,
                description : parsedDescription,
                summary : parsedSummary,
                keyPoints : parsedKeyPoints,
                imageUrl : {images},
                location : parsedLocation,
                latitude : latitudeNumber,
                longitude : longitudeNumber,
                startTime,
                endTime
                // startTime : startTimeUTC,
                // endTime : endTimeUTC
            }
        })

        res.status(httpStatus.CREATED).json({
            msg : "Event created successfully",
            event
        })
    } catch (error) {
        logError("Error in add event", error)
        next(error)
    }
}

//! get all events
export const getAllEvents = async (req, res, next) =>{
    const {page = 1, limit = 10, status, title, location, date} = req.query
    const lang = req.lang
    try {
        const pageNumber = parseInt(page)
        const limitNumber = parseInt(limit)
        const skip = (pageNumber - 1) * limitNumber
        
        const nowIST = dayjs().tz("Asia/Kolkata");
        const nowWithOffset = nowIST.add(5, 'hour').add(30, 'minute');

        let whereCondition = {}

        if(status == "upcoming"){
            whereCondition = {startTime : {gt : nowWithOffset}}
        }
        else if(status == "live"){
            whereCondition = {
                startTime : {lte : nowWithOffset},
                endTime : {gte : nowWithOffset}
            }
        }
        else if(status == "ended"){
            whereCondition = {endTime : {lt : nowWithOffset}}
        }

       else if(location && location.trim() != ""){
            whereCondition = {
                OR : [
                    {location : {path : ['en'], string_contains : location, mode : "insensitive"}},
                    {location : {path : ['hi'], string_contains : location, mode : "insensitive"}}
                ]
            }
        }
       else if(title && title.trim()){
            whereCondition = {
                OR : [
                    {title : {path : ['en'], string_contains : title, mode : "insensitive"}},
                    {title : {path : ['hi'], string_contains : title, mode : "insensitive"}}
                ]
            }
        }

       else if (date && dayjs(date, "YYYY-MM-DD", true).isValid()) {
            const filterDate = dayjs(date, "YYYY-MM-DD");
            whereCondition.AND = [
                ...(whereCondition.AND || []),
                {
                    OR: [
                        {
                            startTime: {
                                gte: filterDate.startOf("day").toDate(),
                                lte: filterDate.endOf("day").toDate(),
                            },
                        },
                        {
                            endTime: {
                                gte: filterDate.startOf("day").toDate(),
                                lte: filterDate.endOf("day").toDate(),
                            },
                        },
                    ],
                },
            ];
        }

       // ✅ Search filter
        // if (search && search.trim() !== "") {
        //     const searchLower = search.toLowerCase();
        //     const searchDate = dayjs(search, "YYYY-MM-DD", true); // optional: only valid if format matches

        //     whereCondition.AND = [
        //         ...(whereCondition.AND || []),
        //         {
        //             OR: [
        //                 { title: { path: [lang], string_contains: searchLower, mode: "insensitive" } },
        //                 { location: { path: [lang], string_contains: searchLower, mode: "insensitive" } },
        //                 ...(searchDate.isValid()
        //                     ? [
        //                           {
        //                               startTime: {
        //                                   gte: searchDate.startOf("day").toDate(),
        //                                   lte: searchDate.endOf("day").toDate(),
        //                               },
        //                           },
        //                           {
        //                               endTime: {
        //                                   gte: searchDate.startOf("day").toDate(),
        //                                   lte: searchDate.endOf("day").toDate(),
        //                               },
        //                           },
        //                       ]
        //                     : []),
        //             ],
        //         },
        //     ];
        // }

        //! get total event
        const totalEvents = await prisma.event.count({where : whereCondition})

        //! get paginated events
        const events = await prisma.event.findMany({
            where : whereCondition,
            skip,
            take : limitNumber,
            orderBy : {
                createdAt : "desc"
            }
        })

        const formatted = events.map(e =>{

            const isHindiMatch = e.title?.hi?.includes(title) || 
                            e.location?.hi?.includes(location)||
                            e.status?.hi?.includes(status)

        const FinalLang =(title || location || status) ?  isHindiMatch ? "hi" : "en" : lang;

            const eventStatus = new Date(e.startTime) > nowWithOffset
             ? "upcoming" : new Date(e.endTime) > nowWithOffset  ? "live" : "ended"

            const statusLabel = {
                en : {
                    upcoming : "upcoming",
                    live : "live",
                    ended : "ended"
                },
                hi : {
                    upcoming : "आने वाला",
                    live : "चल रहा है",
                    ended : "समाप्त"
                }
            }
            const statusText = statusLabel[FinalLang]?.[eventStatus] || eventStatus

            return {
                id : e.id,
                title : pickLanguage(e.title, FinalLang),
                description : pickLanguage(e.description, FinalLang),
                summary : pickLanguage(e.summary, FinalLang),
                keyPoints : pickLanguage(e.keyPoints, FinalLang),
                images : e.imageUrl.images.map(img => img.url),
                location : pickLanguage(e.location, FinalLang),
                latitude : e.latitude,
                longitude : e.longitude,
                startTime : e.startTime,
                endTime : e.endTime,
                status : statusText
            }
        })

        res.status(httpStatus.OK).json({
            total : totalEvents,
            page : pageNumber,
            limit : limitNumber,
            totalPages : Math.ceil(totalEvents / limitNumber),
            events : formatted
        })
    } catch (error) {
        logError("Error in get all events", error)
        next(error)
    }
}

//! get event by id
export const getEventById = async (req, res, next) =>{
    const {eventId} = req.params
    const lang = req.lang
    try {

        const nowIST = dayjs().tz("Asia/Kolkata");
        const nowWithOffset = nowIST.add(5, 'hour').add(30, 'minute');

        const event = await prisma.event.findUnique({
            where : {
                id : eventId
            }
        })
        if(!event) 
            return next(errorHandler(eventError.Event_Not_Exists))

        const eventStatus = new Date(event.startTime) > nowWithOffset ? "upcoming" : new Date(event.endTime) > nowWithOffset ? "live" : "ended";

    // Bilingual labels
    const statusLabels = {
      upcoming: { en: "upcoming", hi: "आने वाला" },
      live: { en: "live", hi: "चल रहा है" },
      ended: { en: "ended", hi: "समाप्त" },
    };

        const formatted = {
            id : event.id,
            title : event.title,
            description : event.description,
            summary : event.summary,
            keyPoints : event.keyPoints,
            images : event.imageUrl.images.map(img => img.url),
            location : event.location,
            latitude : event.latitude,
            longitude : event.longitude,
            startTime : event.startTime,
            endTime : event.endTime,
            status : statusLabels[eventStatus]
        }

        res.status(httpStatus.OK).json(formatted)

    } catch (error) {
        logError("Error in get event by id", error)
        next(error)
    }
}

//! update event
export const updateEvent = async (req, res, next) =>{
    const {eventId} = req.params
    const {title, description, summary, keyPoints = [], location, latitude, longitude, startTime, endTime, existingImages = []} = req.body
    try {
        const parsedTitle = typeof title === "string" ? JSON.parse(title) : title;
        const parsedDescription = typeof description === "string" ? JSON.parse(description) : description;
        const parsedSummary = typeof summary === "string" ? JSON.parse(summary) : summary;
        const parsedLocation = typeof location === "string" ? JSON.parse(location) : location;  

        const latitudeNumber = parseFloat(latitude)
        const longitudeNumber = parseFloat(longitude)

        const existingEvent = await prisma.event.findUnique({
            where : {
                id : eventId
            }
        })
        if(!existingEvent)
            return next(errorHandler(eventError.Event_Not_Exists))

        let imageObj = existingEvent.imageUrl || {images : []}

        const keptImages = []
        const toDelete = []

        //! delete unwanted image from db
        for(const img of imageObj.images){
            if(existingImages.includes(img.url)){
                keptImages.push(img)
            }
            else{
                toDelete.push(img)
            }
        }

        //! delete unwnted images from cloudinary
        for(const img of toDelete){
            await deleteFromCloudinary(img.public_id, next)
        }

        if(req.files && req.files.length > 0){
            for(const file of req.files){
                const result = await uploadToCloudinary(file.path, "Events", next)
                keptImages.push({
                    url : result.secure_url,
                    public_id : result.public_id
                })
            }
        }

        imageObj = {images : keptImages}

        let parsedKeyPoints = Array.isArray(keyPoints)
          ? (keyPoints.length > 0 ? keyPoints : existingEvent.keyPoints)
          : (keyPoints ? JSON.parse(keyPoints) || existingEvent.keyPoints : existingEvent.keyPoints);


          await prisma.event.update({
            where : {
                id : eventId
            },
            data : {
                title : parsedTitle ?? existingEvent.title,
                description : parsedDescription ?? existingEvent.description,
                summary : parsedSummary ?? existingEvent.summary,
                keyPoints : parsedKeyPoints,
                imageUrl : imageObj,
                location : parsedLocation ??existingEvent.location,
                latitude : latitudeNumber ?? existingEvent.latitude,
                longitude : longitudeNumber ?? existingEvent.longitude,
                startTime : startTime ?? existingEvent.startTime,
                endTime : endTime ?? existingEvent.endTime
            }
          })


          res.status(httpStatus.OK).json({
            msg : "Event updated successfully"
          })

    } catch (error) {
        logError("Error in update event", error)
        next(error)
    }
}

//! delete event
export const deleteEvent = async (req, res, next) =>{
    const {eventId} = req.params
    try {
        const existingEvent = await prisma.event.findUnique({
            where : {
                id : eventId
            }
        })
        if(!existingEvent)
            return next(errorHandler(eventError.Event_Not_Exists))

        //! delete images from cloudinary
        const imageObj = existingEvent.imageUrl || {images : []}
        if(imageObj.images && imageObj.images.length > 0){
            for (const img of imageObj.images){
                await deleteFromCloudinary(img.public_id, next)
            }
        }

        await prisma.event.delete({
            where : {
                id : eventId
            }
        })

        res.status(httpStatus.OK).json({
            msg : "Event deleted successfully"
        })
    } catch (error) {
        logError("Error in delete event", error)
        next(error)
    }
}