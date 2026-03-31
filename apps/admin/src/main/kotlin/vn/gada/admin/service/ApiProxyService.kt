package vn.gada.admin.service

import org.springframework.http.*
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Service
import org.springframework.web.client.HttpClientErrorException
import org.springframework.web.client.HttpServerErrorException
import org.springframework.web.client.RestTemplate
import org.springframework.web.util.UriComponentsBuilder
import vn.gada.admin.config.AppProperties
import jakarta.servlet.http.HttpServletRequest

@Service
class ApiProxyService(private val props: AppProperties) {

    private val restTemplate = RestTemplate()

    fun proxy(
        method: HttpMethod,
        path: String,
        queryString: String?,
        body: ByteArray?,
        contentType: MediaType?,
    ): ResponseEntity<ByteArray> {
        val uriBuilder = UriComponentsBuilder
            .fromHttpUrl("${props.apiBaseUrl}${path}")

        if (!queryString.isNullOrBlank()) {
            uriBuilder.query(queryString)
        }

        val adminEmail = SecurityContextHolder.getContext().authentication?.name
        val headers = HttpHeaders().apply {
            set("x-admin-key", props.apiAdminKey)
            adminEmail?.let { set("x-admin-email", it) }
            contentType?.let { this.contentType = it }
            accept = listOf(MediaType.APPLICATION_JSON)
        }

        val entity = HttpEntity(body, headers)

        return try {
            restTemplate.exchange(
                uriBuilder.build(false).toUri(),
                method,
                entity,
                ByteArray::class.java,
            )
        } catch (ex: HttpClientErrorException) {
            ResponseEntity.status(ex.statusCode)
                .contentType(MediaType.APPLICATION_JSON)
                .body(ex.responseBodyAsByteArray)
        } catch (ex: HttpServerErrorException) {
            ResponseEntity.status(ex.statusCode)
                .contentType(MediaType.APPLICATION_JSON)
                .body(ex.responseBodyAsByteArray)
        } catch (ex: Exception) {
            ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""{"error":"Upstream error: ${ex.message}"}""".toByteArray())
        }
    }
}
