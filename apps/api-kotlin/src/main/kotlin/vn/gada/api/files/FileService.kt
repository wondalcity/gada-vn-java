package vn.gada.api.files

import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.services.s3.model.PutObjectRequest
import software.amazon.awssdk.services.s3.presigner.S3Presigner
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest
import vn.gada.api.common.database.DatabaseService
import java.time.Duration
import java.util.UUID

@Service
class FileService(
    private val db: DatabaseService,
    @Value("\${gada.aws.region:ap-southeast-1}") private val region: String,
    @Value("\${gada.aws.bucket:gada-uploads}") private val bucket: String,
    @Value("\${gada.aws.access-key-id:}") private val accessKeyId: String,
    @Value("\${gada.aws.secret-access-key:}") private val secretAccessKey: String
) {

    private val presigner: S3Presigner by lazy {
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
    }

    fun generatePresignedUrl(
        userId: String,
        fileName: String,
        contentType: String,
        folder: String?
    ): Map<String, Any?> {
        val ext = fileName.substringAfterLast('.', "")
        val key = "${folder ?: "uploads"}/$userId/${UUID.randomUUID()}${if (ext.isNotEmpty()) ".$ext" else ""}"

        val putObjectRequest = PutObjectRequest.builder()
            .bucket(bucket)
            .key(key)
            .contentType(contentType)
            .build()

        val presignRequest = PutObjectPresignRequest.builder()
            .signatureDuration(Duration.ofSeconds(300))
            .putObjectRequest(putObjectRequest)
            .build()

        val presignedRequest: PresignedPutObjectRequest = presigner.presignPutObject(presignRequest)

        return mapOf(
            "url" to presignedRequest.url().toString(),
            "key" to key,
            "expiresIn" to 300
        )
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
