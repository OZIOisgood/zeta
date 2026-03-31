package com.m4xon.zeta.auth

interface TokenStorage {
    fun saveToken(token: String)
    fun getToken(): String?
    fun clearToken()

    fun saveRole(role: String)
    fun getRole(): String?
    fun clearRole()
}
