package vn.gada.api.files

import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*
import org.springframework.web.multipart.MultipartFile
import vn.gada.api.common.exception.BadRequestException
import vn.gada.api.common.exception.UnauthorizedException
import vn.gada.api.common.security.AuthUser

@RestController
@RequestMapping("/files")
class FileController(private val fileService: FileService) {

    /** POST /files/presigned-url — Request a pre-signed S3 upload URL */
    @PostMapping("/presigned-url")
    fun getPresignedUrl(
        @AuthenticationPrincipal user: AuthUser?,
        @RequestBody body: Map<String, Any?>
    ): ResponseEntity<Map<String, Any?>> {
        if (user == null) throw UnauthorizedException("Unauthorized")
        val fileName = body["fileName"] as? String ?: throw BadRequestException("fileName is required")
        val contentType = body["contentType"] as? String ?: throw BadRequestException("contentType is required")
        val folder = body["folder"] as? String
        return ok(fileService.generatePresignedUrl(user.id, fileName, contentType, folder))
    }

    /** POST /files/upload-local — Local fallback when S3 is unavailable */
    @PostMapping("/upload-local", consumes = ["multipart/form-data"])
    fun uploadLocal(
        @AuthenticationPrincipal user: AuthUser?,
        @RequestParam("file") file: MultipartFile
    ): ResponseEntity<Map<String, Any?>> {
        if (user == null) throw UnauthorizedException("Unauthorized")
        val contentType = file.contentType ?: "application/octet-stream"
        return ok(fileService.storeLocal(file.bytes, contentType))
    }

    /** POST /files/confirm — Confirm upload completed */
    @PostMapping("/confirm")
    fun confirmUpload(
        @AuthenticationPrincipal user: AuthUser?,
        @RequestBody body: Map<String, Any?>
    ): ResponseEntity<Map<String, Any?>> {
        if (user == null) throw UnauthorizedException("Unauthorized")
        val key = body["key"] as? String ?: throw BadRequestException("key is required")
        val fileName = body["fileName"] as? String ?: throw BadRequestException("fileName is required")
        val contentType = body["contentType"] as? String ?: throw BadRequestException("contentType is required")
        val sizeBytes = (body["sizeBytes"] as? Number)?.toLong()
        return ok(fileService.confirmUpload(user.id, key, fileName, contentType, sizeBytes))
    }

    private fun ok(data: Any?): ResponseEntity<Map<String, Any?>> =
        ResponseEntity.ok(mapOf("statusCode" to 200, "data" to data))
}
