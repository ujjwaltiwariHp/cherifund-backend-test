import { httpStatus } from "../../config/httpStatus.js"
import { prisma } from "../../database/db.js"
import { eventError } from "../../errors/event.js"
import { errorHandler } from "../../util/errorHandler.js"
import { pickLanguage } from "../../util/languageHelper.js"
import { logError } from "../../util/logHelper.js"
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
dayjs.extend(utc);
dayjs.extend(timezone);

//! get all events
export const getAllEvents = async (req, res, next) =>{
    const {page = 1, limit = 10, search} = req.query
    const lang = req.lang
    try {

        const nowIST = dayjs().tz("Asia/Kolkata");
        const nowWithOffset = nowIST.add(5, 'hour').add(30, 'minute');

        const pageNumber = parseInt(page)
        const limitNumber = parseInt(limit)
        const skip = (pageNumber - 1) * limitNumber

        let whereCondition = {
            endTime : {
                gt : new Date()
            }
        }

        if (search && search.trim() !== "" && search != "All") {
      whereCondition = {
        AND : [
            whereCondition,
            {
        OR: [
          { title: { path: ["en"], string_contains: search, mode: "insensitive" } },
          { keyPoints: { path: ["en"], array_contains: [search] } },
          { title: { path: ["hi"], string_contains: search, mode: "insensitive" } },
          { keyPoints: { path: ["hi"], array_contains: [search] } },
        ],
      }
    ]
    }
}

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

            const isHindiMatch =
        e.title?.hi?.includes(search) ||
        (Array.isArray(e.keyPoints?.hi) && e.keyPoints.hi.some((k) => k.includes(search)));

      let FinalLang = search ? (isHindiMatch ? "hi" : "en") : lang;

      if(search == "All"){
        FinalLang = lang
      }
      
            const eventStatus = new Date(e.startTime) > nowWithOffset ? "upcoming" : new Date(e.endTime) > nowWithOffset  ? "live" : "ended"

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

            const statusText = statusLabel[lang]?.[eventStatus] || eventStatus

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

        // ✅ Determine event status
    const eventStatus = new Date(event.startTime) > nowWithOffset ? "upcoming" : new Date(event.endTime) > nowWithOffset ? "live" : "ended";

    // ✅ Add bilingual labels
    const statusLabels = {
      en: {
        upcoming: "upcoming",
        live: "live",
        ended: "ended",
      },
      hi: {
        upcoming: "आने वाला",
        live: "चल रहा है",
        ended: "समाप्त",
      },
    };

    const statusText = statusLabels[lang]?.[eventStatus] || eventStatus;

        const formatted = {
            id : event.id,
            title : pickLanguage(event.title, lang),
            description : pickLanguage(event.description, lang),
            summary : pickLanguage(event.summary, lang),
            keyPoints : pickLanguage(event.keyPoints, lang),
            images : event.imageUrl.images.map(img => img.url),
            location : pickLanguage(event.location, lang),
            latitude : event.latitude,
            longitude : event.longitude,
            startTime : event.startTime,
            endTime : event.endTime,
            status : statusText
        }

        res.status(httpStatus.OK).json(formatted)

    } catch (error) {
        logError("Error in get event by id", error)
        next(error)
    }
}
