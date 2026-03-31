package com.m4xon.zeta.android

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.navigation.compose.rememberNavController
import com.m4xon.zeta.android.auth.AuthViewModel
import com.m4xon.zeta.android.navigation.ZetaNavGraph
import com.m4xon.zeta.android.ui.theme.ZetaTheme

class MainActivity : ComponentActivity() {

    private lateinit var authViewModel: AuthViewModel
    // MutableState so that Compose recomposes when onNewIntent delivers a new invite code
    private var pendingInviteCode by mutableStateOf<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        val app = application as ZetaApp
        authViewModel = ViewModelProvider(this, object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T =
                AuthViewModel(app.authRepository) as T
        })[AuthViewModel::class.java]

        handleIntent(intent)

        setContent {
            ZetaTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    val navController = rememberNavController()
                    ZetaNavGraph(
                        navController = navController,
                        authViewModel = authViewModel,
                        pendingInviteCode = pendingInviteCode,
                        onInviteHandled = { pendingInviteCode = null },
                    )
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleIntent(intent)
    }

    private fun handleIntent(intent: Intent?) {
        val data = intent?.data ?: return
        when {
            data.scheme == "zeta" && data.host == "auth" && data.path == "/callback" -> {
                val code = data.getQueryParameter("code") ?: return
                authViewModel.onAuthCallback(code)
            }
            data.scheme == "zeta" && data.host == "invite" -> {
                // path is "/<code>" — strip leading slash
                val code = data.path?.trimStart('/') ?: return
                if (code.isNotBlank()) pendingInviteCode = code
            }
        }
    }
}
