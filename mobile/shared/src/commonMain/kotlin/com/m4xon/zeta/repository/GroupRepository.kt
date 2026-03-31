package com.m4xon.zeta.repository

import com.m4xon.zeta.api.ZetaApiClient
import com.m4xon.zeta.model.AcceptInvitationResponse
import com.m4xon.zeta.model.Group
import com.m4xon.zeta.model.InvitationInfo
import com.m4xon.zeta.model.InvitationResponse
import com.m4xon.zeta.model.User

class GroupRepository(
    private val apiClient: ZetaApiClient,
) {
    suspend fun getAll(): List<Group> = apiClient.getGroups()

    suspend fun getUsers(groupId: String): List<User> =
        apiClient.getGroupUsers(groupId).data

    suspend fun create(name: String, avatar: String? = null): Group =
        apiClient.createGroup(name, avatar)

    suspend fun invite(groupId: String, email: String): InvitationResponse =
        apiClient.createInvitation(groupId, email)

    suspend fun getInvitationInfo(code: String): InvitationInfo =
        apiClient.getInvitationInfo(code)

    suspend fun acceptInvitation(code: String): AcceptInvitationResponse =
        apiClient.acceptInvitation(code)
}
