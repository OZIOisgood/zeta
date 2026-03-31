package com.m4xon.zeta.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class User(
    val id: String,
    val email: String,
    @SerialName("first_name") val firstName: String,
    @SerialName("last_name") val lastName: String,
    @SerialName("profile_picture_url") val profilePictureUrl: String = "",
    val role: String? = null,
    val language: String? = null,
)

@Serializable
data class UsersResponse(
    val data: List<User>,
)

@Serializable
data class MobileTokenResponse(
    val token: String,
    val user: User,
)
