package com.m4xon.zeta.repository

import com.m4xon.zeta.api.ZetaApiClient
import com.m4xon.zeta.model.Asset

class AssetRepository(
    private val apiClient: ZetaApiClient,
) {
    suspend fun getAll(): List<Asset> = apiClient.getAssets()

    suspend fun getById(id: String): Asset = apiClient.getAsset(id)
}
