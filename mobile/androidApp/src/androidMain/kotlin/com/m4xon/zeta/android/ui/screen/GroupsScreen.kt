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
import com.m4xon.zeta.android.ui.viewmodel.GroupActionState
import com.m4xon.zeta.android.ui.viewmodel.GroupsUiState
import com.m4xon.zeta.android.ui.viewmodel.GroupsViewModel
import com.m4xon.zeta.permissions.Permissions

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GroupsScreen(
    role: String,
    onGroupClick: (String) -> Unit,
    onBack: () -> Unit,
) {
    val context = LocalContext.current
    val app = context.applicationContext as ZetaApp
    val vm: GroupsViewModel = viewModel(factory = object : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T =
            GroupsViewModel(app.groupRepository) as T
    })

    val state by vm.state.collectAsState()
    val action by vm.action.collectAsState()

    val snackbarHostState = remember { SnackbarHostState() }
    var showCreateDialog by remember { mutableStateOf(false) }

    LaunchedEffect(action) {
        when (val a = action) {
            is GroupActionState.Error -> {
                snackbarHostState.showSnackbar(a.message)
                showCreateDialog = false
                vm.clearAction()
            }
            is GroupActionState.Success -> {
                showCreateDialog = false
                vm.clearAction()
            }
            else -> Unit
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Groups") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
            )
        },
        floatingActionButton = {
            if (Permissions.canCreateGroup(role)) {
                FloatingActionButton(onClick = { showCreateDialog = true }) {
                    Icon(Icons.Default.Add, contentDescription = "Create Group")
                }
            }
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
    ) { padding ->
        when (val s = state) {
            is GroupsUiState.Loading -> {
                Column(modifier = Modifier.padding(padding)) {
                    repeat(5) { SkeletonBox(height = 64.dp) }
                }
            }
            is GroupsUiState.Error -> {
                Column(modifier = Modifier.padding(padding)) {
                    EmptyState(title = "Something went wrong", subtitle = s.message)
                    TextButton(onClick = { vm.refresh() }) { Text("Retry") }
                }
            }
            is GroupsUiState.Success -> {
                if (s.groups.isEmpty()) {
                    EmptyState(title = "No groups", modifier = Modifier.padding(padding))
                } else {
                    LazyColumn(
                        contentPadding = padding,
                        modifier = Modifier.fillMaxSize(),
                    ) {
                        items(s.groups, key = { it.id }) { group ->
                            GroupCard(group = group, onClick = { onGroupClick(group.id) })
                            HorizontalDivider(thickness = 1.dp)
                        }
                    }
                }
            }
        }
    }

    if (showCreateDialog) {
        CreateGroupDialog(
            saving = action is GroupActionState.Loading,
            onConfirm = { name ->
                vm.createGroup(name)
                // dialog stays open; dismissed by LaunchedEffect on Success/Error
            },
            onDismiss = { showCreateDialog = false },
        )
    }
}

@Composable
private fun CreateGroupDialog(
    saving: Boolean,
    onConfirm: (name: String) -> Unit,
    onDismiss: () -> Unit,
) {
    var name by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Create Group") },
        text = {
            OutlinedTextField(
                value = name,
                onValueChange = { name = it },
                label = { Text("Group name") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )
        },
        confirmButton = {
            if (saving) {
                CircularProgressIndicator(modifier = Modifier.size(24.dp), strokeWidth = 2.dp)
            } else {
                TextButton(
                    onClick = { onConfirm(name.trim()) },
                    enabled = name.isNotBlank(),
                ) { Text("Create") }
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, enabled = !saving) { Text("Cancel") }
        },
    )
}
