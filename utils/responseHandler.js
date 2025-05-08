/**
 * Send a success response
 * @param {Object} res - Express response object
 * @param {Object} data - Data to send in the response
 * @param {Number} statusCode - HTTP status code (default: 200)
 */
export const successResponse = (res, data, statusCode = 200) => {
    return res.status(statusCode).json({
      success: true,
      ...data,
    })
  }
  
  /**
   * Send an error response
   * @param {Object} res - Express response object
   * @param {String} message - Error message
   * @param {Number} statusCode - HTTP status code (default: 400)
   * @param {Object} error - Error object (optional)
   */
  export const errorResponse = (res, message, statusCode = 400, error = null) => {
    const response = {
      success: false,
      message,
    }
  
    // Add error details in development environment
    if (process.env.NODE_ENV === "development" && error) {
      response.error = error.toString()
      response.stack = error.stack
    }
  
    return res.status(statusCode).json(response)
  }
  