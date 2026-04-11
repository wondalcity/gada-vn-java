package vn.gada.api.files

import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider
import software.amazon.awssdk.core.sync.RequestBody
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.services.s3.model.GetObjectRequest
import software.amazon.awssdk.services.s3.model.PutObjectRequest
import software.amazon.awssdk.services.s3.presigner.S3Presigner
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest
import vn.gada.api.common.database.DatabaseService
import java.time.Duration
import java.util.UUID

@Service
class FileService(
    private val db: DatabaseService,
    @Value("\${gada.aws.region:ap-southeast-1}") val region: String,
    @Value("\${gada.aws.bucket:gada-vn-staging-uploads}") val bucket: String,
    @Value("\${gada.aws.cdn-domain:}") val cdnDomain: String,
    @Value("\${gada.aws.access-key-id:}") private val accessKeyId: String,
    @Value("\${gada.aws.secret-access-key:}") private val secretAccessKey: String
) {

    private val s3Client: S3Client? by lazy {
        try {
            if (accessKeyId.isNotBlank() && secretAccessKey.isNotBlank()) {
                S3Client.builder()
                    .region(Region.of(region))
                    .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(accessKeyId, secretAccessKey)
                    ))
                    .build()
            } else {
                S3Client.builder().region(Region.of(region)).build()
            }
        } catch (e: Exception) { null }
    }

    fun uploadBytes(key: String, bytes: ByteArray, contentType: String) {
        val client = s3Client ?: throw IllegalStateException("S3 not configured")
        client.putObject(
            PutObjectRequest.builder()
                .bucket(bucket).key(key).contentType(contentType).build(),
            RequestBody.fromBytes(bytes)
        )
    }

    private val presigner: S3Presigner? by lazy {
        try {
            if (accessKeyId.isNotBlank() && secretAccessKey.isNotBlank()) {
                S3Presigner.builder()
                    .region(Region.of(region))
                    .credentialsProvider(
                        StaticCredentialsProvider.create(
                            AwsBasicCredentials.create(accessKeyId, secretAccessKey)
                        )
                    )
                    .build()
            } else {
                S3Presigner.builder()
                    .region(Region.of(region))
                    .build()
            }
        } catch (e: Exception) {
            null
        }
    }

    fun generatePresignedUrl(
        userId: String,
        fileName: String,
        contentType: String,
        folder: String?
    ): Map<String, Any?> {
        val ext = fileName.substringAfterLast('.', "")
        val key = "${folder ?: "uploads"}/$userId/${UUID.randomUUID()}${if (ext.isNotEmpty()) ".$ext" else ""}"

        val p = presigner
        if (p != null) {
            try {
                val putObjectRequest = PutObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .contentType(contentType)
                    .build()
                val presignRequest = PutObjectPresignRequest.builder()
                    .signatureDuration(Duration.ofSeconds(300))
                    .putObjectRequest(putObjectRequest)
                    .build()
                val presignedRequest: PresignedPutObjectRequest = p.presignPutObject(presignRequest)
                return mapOf("url" to presignedRequest.url().toString(), "key" to key, "expiresIn" to 300)
            } catch (e: Exception) {
                // Fall through to local upload
            }
        }

        return mapOf("isLocal" to true, "key" to key)
    }

    fun storeLocal(fileBytes: ByteArray, contentType: String): Map<String, Any?> {
        val dataUrl = "data:$contentType;base64," + java.util.Base64.getEncoder().encodeToString(fileBytes)
        return mapOf("key" to dataUrl)
    }

    /**
     * Convert an S3 key to a publicly accessible URL.
     * - data: / http(s): URIs are returned as-is
     * - If CDN domain is configured, prepends CDN domain
     * - Otherwise generates a presigned GET URL valid for 1 hour
     * - Returns null if presigning fails (S3 not available)
     */
    fun toPublicUrl(key: String?): String? {
        if (key.isNullOrBlank()) return null
        if (key.startsWith("http://") || key.startsWith("https://") || key.startsWith("data:")) return key
        if (cdnDomain.isNotBlank()) {
            val base = if (cdnDomain.startsWith("http")) cdnDomain else "https://$cdnDomain"
            return "$base/$key"
        }
        // No CDN — generate presigned GET URL
        val p = presigner ?: return null
        return try {
            val getRequest = GetObjectRequest.builder().bucket(bucket).key(key).build()
            val presignReq = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofHours(1))
                .getObjectRequest(getRequest)
                .build()
            p.presignGetObject(presignReq).url().toString()
        } catch (e: Exception) {
            null
        }
    }

    fun confirmUpload(
        userId: String,
        key: String,
        fileName: String,
        contentType: String,
        sizeBytes: Long?
    ): Map<String, Any?>? {
        val publicUrl = "https://$bucket.s3.$region.amazonaws.com/$key"
        return db.queryForList(
            """INSERT INTO ops.uploaded_files (user_id, s3_key, file_name, content_type, public_url, size_bytes)
               VALUES (?, ?, ?, ?, ?, ?)
               ON CONFLICT (s3_key) DO UPDATE SET updated_at = NOW()
               RETURNING *""",
            userId, key, fileName, contentType, publicUrl, sizeBytes
        ).firstOrNull()
    }
}
