package com.m4xon.zeta.android.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.m4xon.zeta.android.auth.AuthState
import com.m4xon.zeta.android.auth.AuthViewModel
import com.m4xon.zeta.android.ui.screen.*

@Composable
fun ZetaNavGraph(
    navController: NavHostController,
    authViewModel: AuthViewModel,
    pendingInviteCode: String? = null,
    onInviteHandled: () -> Unit = {},
) {
    val authState by authViewModel.state.collectAsState()
    val role = (authState as? AuthState.LoggedIn)?.role ?: ""

    // React to auth state changes — navigate imperatively so the NavHost
    // startDestination (always "login") stays stable and doesn't re-create.
    LaunchedEffect(authState) {
        when (authState) {
            is AuthState.LoggedIn -> {
                val dest = if (pendingInviteCode != null) {
                    onInviteHandled()
                    Screen.InviteAccept.createRoute(pendingInviteCode)
                } else {
                    Screen.Home.route
                }
                navController.navigate(dest) {
                    popUpTo(Screen.Login.route) { inclusive = true }
                }
            }
            is AuthState.LoggedOut -> {
                navController.navigate(Screen.Login.route) {
                    popUpTo(0) { inclusive = true }
                }
            }
            else -> Unit // Loading / Error — stay put
        }
    }

    NavHost(navController = navController, startDestination = Screen.Login.route) {

        composable(Screen.Login.route) {
            LoginScreen()
        }

        composable(Screen.Home.route) {
            HomeScreen(
                onAssetClick = { assetId ->
                    navController.navigate(Screen.AssetDetails.createRoute(assetId))
                },
                onGroupsClick = {
                    navController.navigate(Screen.Groups.route)
                },
                onLogout = {
                    authViewModel.logout()
                },
            )
        }

        composable(
            route = Screen.AssetDetails.route,
            arguments = listOf(navArgument("assetId") { type = NavType.StringType }),
        ) { backStackEntry ->
            val assetId = backStackEntry.arguments?.getString("assetId") ?: return@composable
            AssetDetailsScreen(
                assetId = assetId,
                role = role,
                onBack = { navController.popBackStack() },
            )
        }

        composable(Screen.Groups.route) {
            GroupsScreen(
                role = role,
                onGroupClick = { groupId ->
                    navController.navigate(Screen.GroupDetails.createRoute(groupId))
                },
                onBack = { navController.popBackStack() },
            )
        }

        composable(
            route = Screen.GroupDetails.route,
            arguments = listOf(navArgument("groupId") { type = NavType.StringType }),
        ) { backStackEntry ->
            val groupId = backStackEntry.arguments?.getString("groupId") ?: return@composable
            GroupDetailsScreen(
                groupId = groupId,
                role = role,
                onBack = { navController.popBackStack() },
            )
        }

        composable(
            route = Screen.InviteAccept.route,
            arguments = listOf(navArgument("code") { type = NavType.StringType }),
        ) { backStackEntry ->
            val code = backStackEntry.arguments?.getString("code") ?: return@composable
            InviteAcceptScreen(
                code = code,
                onAccepted = { groupId ->
                    navController.navigate(Screen.GroupDetails.createRoute(groupId)) {
                        popUpTo(Screen.InviteAccept.route) { inclusive = true }
                    }
                },
                onDecline = { navController.popBackStack() },
            )
        }
    }
}
