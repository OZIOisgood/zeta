package com.m4xon.zeta.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Group(
    val id: String,
    val name: String,
    @SerialName("owner_id") val ownerId: String,
    val avatar: String? = null,
    @SerialName("created_at") val createdAt: String,
    @SerialName("updated_at") val updatedAt: String,
)

@Serializable
data class CreateGroupRequest(
    val name: String,
    val avatar: String? = null,
)

@Serializable
data class InvitationResponse(
    val id: String,
    val code: String,
)

@Serializable
data class InvitationInfo(
    val code: String,
    @SerialName("group_name") val groupName: String,
    @SerialName("group_avatar") val groupAvatar: String? = null,
)

@Serializable
data class AcceptInvitationRequest(
    val code: String,
)

@Serializable
data class AcceptInvitationResponse(
    @SerialName("group_id") val groupId: String,
)
