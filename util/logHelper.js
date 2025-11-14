import logger from "./logger.js";

const logError = (msg, error) =>{
    logger.error(`${msg}: ${error.message}`, {stack : error.stack})
}

const logInfo = (msg) =>{
    logger.info(msg)
}

const logWarn = (msg) =>{
    logger.warn(msg)
}

export {logError, logInfo, logWarn}

