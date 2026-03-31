package com.m4xon.zeta.android.navigation

sealed class Screen(val route: String) {
    data object Login         : Screen("login")
    data object Home          : Screen("home")
    data object AssetDetails  : Screen("asset/{assetId}") {
        fun createRoute(assetId: String) = "asset/$assetId"
    }
    data object Groups        : Screen("groups")
    data object GroupDetails  : Screen("group/{groupId}") {
        fun createRoute(groupId: String) = "group/$groupId"
    }
    data object InviteAccept  : Screen("invite/{code}") {
        fun createRoute(code: String) = "invite/$code"
    }
}
