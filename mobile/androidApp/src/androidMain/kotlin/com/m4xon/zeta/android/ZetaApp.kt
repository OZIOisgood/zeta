package com.m4xon.zeta.android

import android.app.Application
import com.m4xon.zeta.android.auth.EncryptedTokenStorage
import com.m4xon.zeta.api.ZetaApiClient
import com.m4xon.zeta.auth.AuthRepository
import com.m4xon.zeta.auth.TokenStorage
import com.m4xon.zeta.repository.AssetRepository
import com.m4xon.zeta.repository.GroupRepository
import com.m4xon.zeta.repository.ReviewRepository

class ZetaApp : Application() {

    // Manual DI — simple singleton graph
    val tokenStorage: TokenStorage by lazy { EncryptedTokenStorage(this) }

    val apiClient: ZetaApiClient by lazy {
        ZetaApiClient(
            baseUrl = BASE_URL,
            tokenProvider = { tokenStorage.getToken() },
        )
    }

    val authRepository: AuthRepository by lazy {
        AuthRepository(apiClient, tokenStorage)
    }

    val assetRepository: AssetRepository by lazy { AssetRepository(apiClient) }

    val groupRepository: GroupRepository by lazy { GroupRepository(apiClient) }

    val reviewRepository: ReviewRepository by lazy { ReviewRepository(apiClient) }

    companion object {
        // Change to your local dev IP when testing on a physical device, e.g. "http://192.168.x.x:8080"
        const val BASE_URL = "http://10.0.2.2:8080"
    }
}
