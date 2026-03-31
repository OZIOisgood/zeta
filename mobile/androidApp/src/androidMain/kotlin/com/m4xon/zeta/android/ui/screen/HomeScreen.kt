package com.m4xon.zeta.android.ui.screen

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.filled.AccountBox
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.compose.ui.platform.LocalContext
import com.m4xon.zeta.android.ZetaApp
import com.m4xon.zeta.android.ui.components.*
import com.m4xon.zeta.android.ui.viewmodel.HomeUiState
import com.m4xon.zeta.android.ui.viewmodel.HomeViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    onAssetClick: (String) -> Unit,
    onGroupsClick: () -> Unit,
    onLogout: () -> Unit,
) {
    val context = LocalContext.current
    val app = context.applicationContext as ZetaApp
    val vm: HomeViewModel = viewModel(factory = object : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T =
            HomeViewModel(app.assetRepository) as T
    })

    val state by vm.state.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Zeta") },
                actions = {
                    IconButton(onClick = onGroupsClick) {
                        Icon(Icons.Default.AccountBox, contentDescription = "Groups")
                    }
                    IconButton(onClick = onLogout) {
                        Icon(Icons.AutoMirrored.Filled.ExitToApp, contentDescription = "Sign out")
                    }
                },
            )
        },
    ) { padding ->
        when (val s = state) {
            is HomeUiState.Loading -> {
                LazyVerticalGrid(
                    columns = GridCells.Fixed(2),
                    contentPadding = PaddingValues(8.dp),
                    modifier = Modifier
                        .padding(padding)
                        .fillMaxSize(),
                ) {
                    items(6) { SkeletonCard(modifier = Modifier.padding(4.dp)) }
                }
            }
            is HomeUiState.Error -> {
                Column(modifier = Modifier.padding(padding)) {
                    EmptyState(title = "Something went wrong", subtitle = s.message)
                    TextButton(onClick = { vm.refresh() }) { Text("Retry") }
                }
            }
            is HomeUiState.Success -> {
                if (s.assets.isEmpty()) {
                    EmptyState(
                        title = "No assets yet",
                        subtitle = "Upload your first video from the web app.",
                        modifier = Modifier.padding(padding),
                    )
                } else {
                    LazyVerticalGrid(
                        columns = GridCells.Fixed(2),
                        contentPadding = PaddingValues(8.dp),
                        modifier = Modifier
                            .padding(padding)
                            .fillMaxSize(),
                    ) {
                        items(s.assets, key = { it.id }) { asset ->
                            AssetCard(
                                asset = asset,
                                onClick = { onAssetClick(asset.id) },
                                modifier = Modifier.padding(4.dp),
                            )
                        }
                    }
                }
            }
        }
    }
}
