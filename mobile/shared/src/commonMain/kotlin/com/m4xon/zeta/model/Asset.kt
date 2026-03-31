package com.m4xon.zeta.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Asset(
    val id: String,
    val title: String,
    val description: String,
    @SerialName("owner_id") val ownerId: String,
    val status: String,
    val thumbnail: String? = null,
    @SerialName("playback_id") val playbackId: String? = null,
    val videos: List<Video>? = null,
)

@Serializable
data class Video(
    val id: String,
    @SerialName("playback_id") val playbackId: String = "",
    val status: String,
    @SerialName("review_count") val reviewCount: Long = 0,
)

@Serializable
data class CreateAssetResponse(
    @SerialName("asset_id") val assetId: String,
    val videos: List<VideoUpload>,
)

@Serializable
data class VideoUpload(
    val id: String,
    @SerialName("upload_url") val uploadUrl: String,
    val filename: String,
)
