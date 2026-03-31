package com.m4xon.zeta.android.ui.screen

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import com.m4xon.zeta.android.ZetaApp
import com.m4xon.zeta.android.ui.components.*
import com.m4xon.zeta.android.ui.viewmodel.GroupDetailsUiState
import com.m4xon.zeta.android.ui.viewmodel.GroupDetailsViewModel
import com.m4xon.zeta.android.ui.viewmodel.InviteActionState
import com.m4xon.zeta.permissions.Permissions

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GroupDetailsScreen(
    groupId: String,
    role: String,
    onBack: () -> Unit,
) {
    val context = LocalContext.current
    val app = context.applicationContext as ZetaApp
    val vm: GroupDetailsViewModel = viewModel(
        key = "group_$groupId",
        factory = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T =
                GroupDetailsViewModel(groupId, app.groupRepository) as T
        },
    )

    val state by vm.state.collectAsState()
    val inviteAction by vm.inviteAction.collectAsState()

    val snackbarHostState = remember { SnackbarHostState() }
    var showInviteDialog by remember { mutableStateOf(false) }

    LaunchedEffect(inviteAction) {
        when (val a = inviteAction) {
            is InviteActionState.Success -> {
                snackbarHostState.showSnackbar("Invitation sent")
                showInviteDialog = false
                vm.clearInviteAction()
            }
            is InviteActionState.Error -> {
                snackbarHostState.showSnackbar(a.message)
                showInviteDialog = false
                vm.clearInviteAction()
            }
            else -> Unit
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Members") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
            )
        },
        floatingActionButton = {
            if (Permissions.canInviteToGroup(role)) {
                FloatingActionButton(onClick = { showInviteDialog = true }) {
                    Icon(Icons.Default.Add, contentDescription = "Invite")
                }
            }
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
    ) { padding ->
        when (val s = state) {
            is GroupDetailsUiState.Loading -> {
                Column(modifier = Modifier.padding(padding)) {
                    repeat(5) { SkeletonBox(height = 60.dp) }
                }
            }
            is GroupDetailsUiState.Error -> {
                Column(modifier = Modifier.padding(padding)) {
                    EmptyState(title = "Something went wrong", subtitle = s.message)
                    TextButton(onClick = { vm.refresh() }) { Text("Retry") }
                }
            }
            is GroupDetailsUiState.Success -> {
                if (s.users.isEmpty()) {
                    EmptyState(title = "No members", modifier = Modifier.padding(padding))
                } else {
                    LazyColumn(
                        contentPadding = padding,
                        modifier = Modifier.fillMaxSize(),
                    ) {
                        items(s.users, key = { it.id }) { user ->
                            UserRow(user = user)
                            HorizontalDivider(thickness = 1.dp)
                        }
                    }
                }
            }
        }
    }

    if (showInviteDialog) {
        InviteDialog(
            sending = inviteAction is InviteActionState.Loading,
            onConfirm = { email ->
                vm.inviteUser(email)
                // dialog stays open; dismissed by LaunchedEffect on Success/Error
            },
            onDismiss = { showInviteDialog = false },
        )
    }
}

@Composable
private fun InviteDialog(
    sending: Boolean,
    onConfirm: (email: String) -> Unit,
    onDismiss: () -> Unit,
) {
    var email by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Invite Member") },
        text = {
            OutlinedTextField(
                value = email,
                onValueChange = { email = it },
                label = { Text("Email address") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )
        },
        confirmButton = {
            if (sending) {
                CircularProgressIndicator(modifier = Modifier.size(24.dp), strokeWidth = 2.dp)
            } else {
                TextButton(
                    onClick = { onConfirm(email.trim()) },
                    enabled = email.isNotBlank(),
                ) { Text("Send Invite") }
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, enabled = !sending) { Text("Cancel") }
        },
    )
}
