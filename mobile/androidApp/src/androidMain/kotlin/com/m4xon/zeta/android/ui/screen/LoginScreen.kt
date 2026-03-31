package com.m4xon.zeta.android.ui.screen

import android.content.Context
import androidx.browser.customtabs.CustomTabsIntent
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.net.toUri
import com.m4xon.zeta.android.ZetaApp

@Composable
fun LoginScreen() {
    val context = LocalContext.current
    val baseUrl = ZetaApp.BASE_URL

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = "Zeta",
            fontSize = 40.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onBackground,
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "Video coaching platform",
            fontSize = 16.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(modifier = Modifier.height(48.dp))
        Button(
            onClick = { openLoginInCustomTab(context, baseUrl) },
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text("Sign in")
        }
    }
}

private fun openLoginInCustomTab(context: Context, baseUrl: String) {
    val loginUrl = "$baseUrl/auth/login/mobile"
    CustomTabsIntent.Builder()
        .setShowTitle(false)
        .build()
        .launchUrl(context, loginUrl.toUri())
}
