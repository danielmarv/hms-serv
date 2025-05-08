/**
 * @desc    Standard API Response class
 * @author  HMS Team
 * @version 1.0
 */
export class ApiResponse {
    /**
     * Creates a standardized API response
     * @param {number} statusCode - HTTP status code
     * @param {any} data - Response data
     * @param {string} message - Response message
     */
    constructor(statusCode, data, message = "Success") {
      this.statusCode = statusCode
      this.data = data
      this.message = message
      this.success = statusCode < 400
      this.timestamp = new Date().toISOString()
    }
  }
  
  /**
   * @desc    Success response with data
   * @param {any} data - Response data
   * @param {string} message - Success message
   * @param {number} statusCode - HTTP status code (default: 200)
   * @returns {ApiResponse} Standardized API response
   */
  export const successResponse = (data, message = "Success", statusCode = 200) => {
    return new ApiResponse(statusCode, data, message)
  }
  
  /**
   * @desc    Created response with data
   * @param {any} data - Response data
   * @param {string} message - Success message
   * @returns {ApiResponse} Standardized API response with 201 status
   */
  export const createdResponse = (data, message = "Resource created successfully") => {
    return new ApiResponse(201, data, message)
  }
  
  /**
   * @desc    No content response
   * @param {string} message - Success message
   * @returns {ApiResponse} Standardized API response with 204 status
   */
  export const noContentResponse = (message = "No content") => {
    return new ApiResponse(204, null, message)
  }
  
  /**
   * @desc    Helper function to send standardized response
   * @param {object} res - Express response object
   * @param {ApiResponse} apiResponse - API response object
   */
  export const sendResponse = (res, apiResponse) => {
    return res.status(apiResponse.statusCode).json(apiResponse)
  }
  