package vn.gada.api.common

data class ApiResponse<T>(
    val statusCode: Int,
    val data: T? = null,
    val message: String? = null
) {
    companion object {
        fun <T> ok(data: T) = ApiResponse(200, data)
        fun <T> created(data: T) = ApiResponse(201, data)
        fun error(statusCode: Int, message: String) = ApiResponse<Nothing>(statusCode, null, message)
    }
}
