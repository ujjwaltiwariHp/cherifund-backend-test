import winston from "winston"
import "winston-daily-rotate-file"
import fs from "fs"
import path from "path"

//! main folder for logs
const logUpload = path.join(process.cwd(),  "logs")

//! sub-folder in logs
const combineLogPath = path.join(logUpload, "combined")
const errorLogPath = path.join(logUpload, "error")

//! create folder if they don't exist
if(!fs.existsSync(combineLogPath)) fs.mkdirSync(combineLogPath, {recursive : true})
if(!fs.existsSync(errorLogPath)) fs.mkdirSync(errorLogPath, {recursive : true})

//! format for human readability 
const logFormat = winston.format.printf(({timestamp, level, message}) => {
    return `${timestamp} [${level.toUpperCase()}] : ${message}`
})

//! custom colors
winston.addColors({
    info: "blue",
    warn: "yellow",
    error: "red",
    debug: "magenta",
    verbose: "cyan"
})

//! console format with colors
const consoleFormat = winston.format.combine(
winston.format.colorize({all : true}),
winston.format.timestamp({format : "YYYY-MM-DD HH:mm:ss"}),
winston.format.printf(({timestamp, level, message})=>{
    return `${timestamp} [${level}] : ${message}`
})
)

//! transport for files
const transport = new winston.transports.DailyRotateFile({
    filename : path.join(combineLogPath, "%DATE%-combined.log"),
    datePattern : "YYYY-MM-DD",
    zippedArchive : true,
    maxSize : "20m",
    maxFiles : "7d"
})

const errorTransport = new winston.transports.DailyRotateFile({
    level : "error",
    filename : path.join(errorLogPath, "%DATE%-error.log"),
    datePattern : "YYYY-MM-DD",
    zippedArchive : true,
    maxSize : "20m",
    maxFiles : "7d"
})

const logger = winston.createLogger({
    level : process.env.LOG_LEVEL || "info",
    format : winston.format.combine(
        winston.format.timestamp({format : "YYYY-MM-DD HH:mm:ss"}),
        logFormat
    ),
    transports : [
        transport, errorTransport,
        ...(process.env.NODE_ENV === "development" ? [new winston.transports.Console({format : consoleFormat})] : [])
    ]
})

export default logger