package com.m4xon.zeta.repository

import com.m4xon.zeta.api.ZetaApiClient
import com.m4xon.zeta.model.Review

class ReviewRepository(
    private val apiClient: ZetaApiClient,
) {
    suspend fun getReviews(videoId: String): List<Review> =
        apiClient.getReviews(videoId)

    suspend fun create(videoId: String, content: String, timestampSeconds: Int? = null): Review =
        apiClient.createReview(videoId, content, timestampSeconds)

    suspend fun update(videoId: String, reviewId: String, content: String): Review =
        apiClient.updateReview(videoId, reviewId, content)

    suspend fun delete(videoId: String, reviewId: String) =
        apiClient.deleteReview(videoId, reviewId)

    suspend fun enhance(text: String): String =
        apiClient.enhanceText(text).enhancedText
}
