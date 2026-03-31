package com.m4xon.zeta.permissions

object Permissions {
    // Role constants matching backend (internal/permissions/permissions.go)
    const val ROLE_ADMIN = "admin"
    const val ROLE_EXPERT = "expert"
    const val ROLE_STUDENT = "student"

    fun canCreateReview(role: String): Boolean = role == ROLE_ADMIN || role == ROLE_EXPERT
    fun canEditReview(role: String): Boolean = role == ROLE_ADMIN || role == ROLE_EXPERT
    fun canDeleteReview(role: String): Boolean = role == ROLE_ADMIN || role == ROLE_EXPERT
    fun canEnhanceReview(role: String): Boolean = role == ROLE_ADMIN || role == ROLE_EXPERT

    fun canCreateGroup(role: String): Boolean = role == ROLE_ADMIN || role == ROLE_EXPERT
    fun canInviteToGroup(role: String): Boolean = role == ROLE_ADMIN || role == ROLE_EXPERT
}
