package com.m4xon.zeta.android.ui.screen

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBox
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import com.m4xon.zeta.android.ZetaApp
import com.m4xon.zeta.android.ui.viewmodel.InviteAcceptUiState
import com.m4xon.zeta.android.ui.viewmodel.InviteAcceptViewModel

@Composable
fun InviteAcceptScreen(
    code: String,
    onAccepted: (groupId: String) -> Unit,
    onDecline: () -> Unit,
) {
    val context = LocalContext.current
    val app = context.applicationContext as ZetaApp
    val vm: InviteAcceptViewModel = viewModel(
        key = "invite_$code",
        factory = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T =
                InviteAcceptViewModel(code, app.groupRepository) as T
        },
    )

    val state by vm.state.collectAsState()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        contentAlignment = Alignment.Center,
    ) {
        when (val s = state) {
            is InviteAcceptUiState.Loading -> {
                CircularProgressIndicator()
            }

            is InviteAcceptUiState.Accepting -> {
                CircularProgressIndicator()
            }

            is InviteAcceptUiState.Error -> {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    Text(
                        text = s.message,
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.error,
                        textAlign = TextAlign.Center,
                    )
                    OutlinedButton(onClick = onDecline) { Text("Go Back") }
                }
            }

            is InviteAcceptUiState.Ready -> {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(24.dp),
                ) {
                    Icon(
                        imageVector = Icons.Default.AccountBox,
                        contentDescription = null,
                        modifier = Modifier.size(64.dp),
                        tint = MaterialTheme.colorScheme.primary,
                    )
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Text(
                            text = "You've been invited to",
                            style = MaterialTheme.typography.bodyLarge,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Text(
                            text = s.info.groupName,
                            style = MaterialTheme.typography.headlineMedium,
                            fontWeight = FontWeight.Bold,
                            textAlign = TextAlign.Center,
                        )
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        OutlinedButton(onClick = onDecline) { Text("Decline") }
                        Button(onClick = { vm.accept(onAccepted) }) { Text("Join Group") }
                    }
                }
            }
        }
    }
}
