package com.m4xon.zeta.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Review(
    val id: String,
    val content: String,
    @SerialName("timestamp_seconds") val timestampSeconds: Int? = null,
    @SerialName("created_at") val createdAt: String,
)

@Serializable
data class EnhanceTextRequest(
    val text: String,
    val language: String = "en",
)

@Serializable
data class EnhanceTextResponse(
    @SerialName("enhanced_text") val enhancedText: String,
)
