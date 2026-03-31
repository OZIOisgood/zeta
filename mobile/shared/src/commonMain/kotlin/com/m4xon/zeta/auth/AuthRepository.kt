package com.m4xon.zeta.auth

import com.m4xon.zeta.api.ZetaApiClient
import com.m4xon.zeta.model.MobileTokenResponse
import com.m4xon.zeta.model.User

class AuthRepository(
    private val apiClient: ZetaApiClient,
    private val tokenStorage: TokenStorage,
) {
    fun getSavedToken(): String? = tokenStorage.getToken()

    fun saveToken(token: String) = tokenStorage.saveToken(token)

    fun clearToken() = tokenStorage.clearToken()

    fun getSavedRole(): String? = tokenStorage.getRole()

    fun saveRole(role: String) = tokenStorage.saveRole(role)

    fun clearRole() = tokenStorage.clearRole()

    suspend fun getMe(): User = apiClient.getMe()

    /** Exchange OAuth code → JWT. Returns the raw JWT string. */
    suspend fun exchangeCode(code: String): String =
        apiClient.exchangeMobileCode(code).token

    /** Exchange OAuth code → full MobileTokenResponse (token + user with role). */
    suspend fun exchangeCodeFull(code: String): MobileTokenResponse =
        apiClient.exchangeMobileCode(code)
}
