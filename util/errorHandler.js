export const errorHandler = (message)=>{
    const error = new Error()
    error.statusCode = message.status
    error.message = message.message
    return error
}