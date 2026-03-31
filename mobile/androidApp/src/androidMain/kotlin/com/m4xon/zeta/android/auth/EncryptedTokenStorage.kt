package com.m4xon.zeta.android.auth

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.m4xon.zeta.auth.TokenStorage

private const val PREFS_NAME = "zeta_secure_prefs"
private const val KEY_TOKEN = "auth_token"
private const val KEY_ROLE = "auth_role"

class EncryptedTokenStorage(context: Context) : TokenStorage {
    private val prefs by lazy {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
        EncryptedSharedPreferences.create(
            context,
            PREFS_NAME,
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
        )
    }

    override fun saveToken(token: String) {
        prefs.edit().putString(KEY_TOKEN, token).apply()
    }

    override fun getToken(): String? = prefs.getString(KEY_TOKEN, null)

    override fun clearToken() {
        prefs.edit().remove(KEY_TOKEN).apply()
    }

    override fun saveRole(role: String) {
        prefs.edit().putString(KEY_ROLE, role).apply()
    }

    override fun getRole(): String? = prefs.getString(KEY_ROLE, null)

    override fun clearRole() {
        prefs.edit().remove(KEY_ROLE).apply()
    }
}
