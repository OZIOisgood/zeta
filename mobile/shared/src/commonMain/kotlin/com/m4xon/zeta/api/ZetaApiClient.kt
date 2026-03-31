package com.m4xon.zeta.api

import com.m4xon.zeta.model.*
import io.ktor.client.*
import io.ktor.client.call.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.client.plugins.logging.*
import io.ktor.client.request.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import kotlinx.serialization.json.Json

class ZetaApiClient(
    private val baseUrl: String,
    private val tokenProvider: suspend () -> String? = { null },
) {
    private val client = HttpClient {
        install(ContentNegotiation) {
            json(Json {
                ignoreUnknownKeys = true
                isLenient = true
            })
        }
        install(Logging) {
            level = LogLevel.NONE
        }
    }

    private suspend fun HttpRequestBuilder.authorize() {
        tokenProvider()?.let { token ->
            header(HttpHeaders.Authorization, "Bearer $token")
        }
    }

    // -- Auth --

    suspend fun getMe(): User =
        client.get("$baseUrl/auth/me") { authorize() }.body()

    /** Exchange OAuth code for a JWT (mobile flow). Returns the raw JWT string. */
    suspend fun exchangeMobileCode(code: String): MobileTokenResponse =
        client.post("$baseUrl/auth/token/mobile") {
            contentType(ContentType.Application.Json)
            setBody(mapOf("code" to code))
        }.body()

    // -- Assets --

    suspend fun getAssets(): List<Asset> =
        client.get("$baseUrl/assets") { authorize() }.body()

    suspend fun getAsset(id: String): Asset =
        client.get("$baseUrl/assets/$id") { authorize() }.body()

    // -- Reviews --

    suspend fun getReviews(videoId: String): List<Review> =
        client.get("$baseUrl/assets/videos/$videoId/reviews") { authorize() }.body()

    suspend fun createReview(videoId: String, content: String, timestampSeconds: Int? = null): Review {
        val body = buildMap<String, Any> {
            put("content", content)
            if (timestampSeconds != null) put("timestamp_seconds", timestampSeconds)
        }
        return client.post("$baseUrl/assets/videos/$videoId/reviews") {
            authorize()
            contentType(ContentType.Application.Json)
            setBody(body)
        }.body()
    }

    suspend fun updateReview(videoId: String, reviewId: String, content: String): Review =
        client.put("$baseUrl/assets/videos/$videoId/reviews/$reviewId") {
            authorize()
            contentType(ContentType.Application.Json)
            setBody(mapOf("content" to content))
        }.body()

    suspend fun deleteReview(videoId: String, reviewId: String) {
        val response = client.delete("$baseUrl/assets/videos/$videoId/reviews/$reviewId") { authorize() }
        if (!response.status.isSuccess()) {
            val body = runCatching { response.body<String>() }.getOrDefault("")
            throw Exception("Delete review failed (${response.status.value}): $body")
        }
    }

    suspend fun enhanceText(text: String): EnhanceTextResponse =
        client.post("$baseUrl/reviews/enhance") {
            authorize()
            contentType(ContentType.Application.Json)
            setBody(mapOf("text" to text))
        }.body()

    // -- Groups --

    suspend fun getGroups(): List<Group> =
        client.get("$baseUrl/groups") { authorize() }.body()

    suspend fun getGroupUsers(groupId: String): UsersResponse =
        client.get("$baseUrl/groups/$groupId/users") { authorize() }.body()

    suspend fun createGroup(name: String, avatar: String? = null): Group =
        client.post("$baseUrl/groups") {
            authorize()
            contentType(ContentType.Application.Json)
            setBody(CreateGroupRequest(name = name, avatar = avatar))
        }.body()

    // -- Invitations --

    suspend fun createInvitation(groupId: String, email: String): InvitationResponse =
        client.post("$baseUrl/groups/$groupId/invitations") {
            authorize()
            contentType(ContentType.Application.Json)
            setBody(mapOf("email" to email))
        }.body()

    suspend fun getInvitationInfo(code: String): InvitationInfo =
        client.get("$baseUrl/groups/invitations/$code") { authorize() }.body()

    suspend fun acceptInvitation(code: String): AcceptInvitationResponse =
        client.post("$baseUrl/groups/invitations/accept") {
            authorize()
            contentType(ContentType.Application.Json)
            setBody(AcceptInvitationRequest(code = code))
        }.body()
}
