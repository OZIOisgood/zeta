package com.m4xon.zeta.android.ui.screen

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import com.m4xon.zeta.android.ZetaApp
import com.m4xon.zeta.android.ui.components.*
import com.m4xon.zeta.android.ui.viewmodel.*
import com.m4xon.zeta.model.Review
import com.m4xon.zeta.permissions.Permissions

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AssetDetailsScreen(
    assetId: String,
    role: String,
    onBack: () -> Unit,
) {
    val context = LocalContext.current
    val app = context.applicationContext as ZetaApp
    val vm: AssetDetailsViewModel = viewModel(
        key = "asset_$assetId",
        factory = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T =
                AssetDetailsViewModel(assetId, app.assetRepository, app.reviewRepository) as T
        },
    )

    val state by vm.state.collectAsState()
    val reviewAction by vm.reviewAction.collectAsState()
    val enhancedText by vm.enhancedText.collectAsState()
    val enhancing by vm.enhancing.collectAsState()

    val snackbarHostState = remember { SnackbarHostState() }

    // Show snackbar on action result
    LaunchedEffect(reviewAction) {
        when (val a = reviewAction) {
            is ReviewActionState.Error -> {
                snackbarHostState.showSnackbar(a.message)
                vm.clearReviewAction()
            }
            is ReviewActionState.Success -> vm.clearReviewAction()
            else -> Unit
        }
    }

    // Review form dialog state
    var showReviewDialog by remember { mutableStateOf(false) }
    var editingReview by remember { mutableStateOf<Review?>(null) }
    var deleteTarget by remember { mutableStateOf<Review?>(null) }

    val canWrite = Permissions.canCreateReview(role)
    val assetCompleted = (state as? AssetDetailsUiState.Success)?.data?.asset?.status == "completed"

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    val title = (state as? AssetDetailsUiState.Success)?.data?.asset?.title ?: ""
                    Text(title, maxLines = 1)
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
            )
        },
        floatingActionButton = {
            if (canWrite && !assetCompleted && state is AssetDetailsUiState.Success) {
                FloatingActionButton(onClick = {
                    editingReview = null
                    showReviewDialog = true
                }) {
                    Icon(Icons.Default.Add, contentDescription = "Add Review")
                }
            }
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
    ) { padding ->
        when (val s = state) {
            is AssetDetailsUiState.Loading -> {
                Column(
                    modifier = Modifier
                        .padding(padding)
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    SkeletonBox(height = 200.dp)
                    SkeletonBox(height = 20.dp, width = 200.dp)
                    SkeletonBox(height = 14.dp, width = 100.dp)
                }
            }
            is AssetDetailsUiState.Error -> {
                Column(modifier = Modifier.padding(padding)) {
                    EmptyState(title = "Something went wrong", subtitle = s.message)
                    TextButton(onClick = { vm.refresh() }) { Text("Retry") }
                }
            }
            is AssetDetailsUiState.Success -> {
                val data = s.data
                val asset = data.asset
                val videos = asset.videos ?: emptyList()
                val selectedVideo = videos.getOrNull(data.selectedVideoIndex)

                LazyColumn(
                    contentPadding = PaddingValues(
                        start = 16.dp,
                        end = 16.dp,
                        top = padding.calculateTopPadding() + 8.dp,
                        bottom = padding.calculateBottomPadding() + 80.dp,
                    ),
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    item { VideoPlayerStub(playbackId = selectedVideo?.playbackId) }

                    item {
                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text(
                                text = asset.title,
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold,
                            )
                            StatusBadge(status = asset.status)
                        }
                    }

                    if (asset.description.isNotBlank()) {
                        item {
                            Text(
                                text = asset.description,
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }

                    if (videos.size > 1) {
                        item {
                            Text(
                                text = "Videos",
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.SemiBold,
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                videos.forEachIndexed { idx, _ ->
                                    FilterChip(
                                        selected = idx == data.selectedVideoIndex,
                                        onClick = { vm.selectVideo(idx) },
                                        label = { Text("Video ${idx + 1}") },
                                    )
                                }
                            }
                        }
                    }

                    item {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            Text(
                                text = "Reviews",
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.SemiBold,
                            )
                            if (data.reviewsLoading) {
                                CircularProgressIndicator(modifier = Modifier.size(14.dp), strokeWidth = 2.dp)
                            }
                        }
                    }

                    if (!data.reviewsLoading) {
                        if (data.reviews.isEmpty()) {
                            item {
                                EmptyState(
                                    title = "No reviews yet",
                                    subtitle = "Reviews will appear here once coaches provide feedback.",
                                )
                            }
                        } else {
                            items(data.reviews, key = { it.id }) { review ->
                                ReviewCard(
                                    review = review,
                                    playbackId = selectedVideo?.playbackId,
                                    canEdit = canWrite && !assetCompleted,
                                    onEdit = {
                                        editingReview = review
                                        showReviewDialog = true
                                    },
                                    onDelete = { deleteTarget = review },
                                )
                                HorizontalDivider(thickness = 1.dp)
                            }
                        }
                    }
                }
            }
        }
    }

    // Review create / edit dialog
    if (showReviewDialog) {
        ReviewFormDialog(
            initial = editingReview,
            enhancing = enhancing,
            enhancedText = enhancedText,
            onEnhance = { text -> vm.enhanceText(text) },
            onClearEnhanced = { vm.clearEnhancedText() },
            onConfirm = { content, timestamp ->
                val editing = editingReview
                if (editing != null) {
                    vm.updateReview(editing.id, content)
                } else {
                    vm.createReview(content, timestamp)
                }
                showReviewDialog = false
                editingReview = null
                vm.clearEnhancedText()
            },
            onDismiss = {
                showReviewDialog = false
                editingReview = null
                vm.clearEnhancedText()
            },
        )
    }

    // Delete confirmation dialog
    deleteTarget?.let { review ->
        AlertDialog(
            onDismissRequest = { deleteTarget = null },
            title = { Text("Delete Review") },
            text = { Text("Are you sure you want to delete this review?") },
            confirmButton = {
                TextButton(onClick = {
                    vm.deleteReview(review.id)
                    deleteTarget = null
                }) { Text("Delete", color = MaterialTheme.colorScheme.error) }
            },
            dismissButton = {
                TextButton(onClick = { deleteTarget = null }) { Text("Cancel") }
            },
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ReviewFormDialog(
    initial: Review?,
    enhancing: Boolean,
    enhancedText: String?,
    onEnhance: (String) -> Unit,
    onClearEnhanced: () -> Unit,
    onConfirm: (content: String, timestampSeconds: Int?) -> Unit,
    onDismiss: () -> Unit,
) {
    var text by remember(initial) { mutableStateOf(initial?.content ?: "") }
    var timestampText by remember(initial) {
        mutableStateOf(initial?.timestampSeconds?.toString() ?: "")
    }

    // When enhanced text arrives, apply it to the field
    LaunchedEffect(enhancedText) {
        if (enhancedText != null) {
            text = enhancedText
            onClearEnhanced()
        }
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (initial != null) "Edit Review" else "Add Review") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = text,
                    onValueChange = { text = it },
                    label = { Text("Review") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 3,
                    maxLines = 6,
                )
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    OutlinedTextField(
                        value = timestampText,
                        onValueChange = { timestampText = it.filter { c -> c.isDigit() } },
                        label = { Text("Timestamp (s)") },
                        modifier = Modifier.weight(1f),
                        singleLine = true,
                    )
                    if (enhancing) {
                        CircularProgressIndicator(modifier = Modifier.size(24.dp), strokeWidth = 2.dp)
                    } else {
                        FilledTonalIconButton(
                            onClick = { if (text.isNotBlank()) onEnhance(text) },
                            enabled = text.isNotBlank(),
                        ) {
                            Icon(Icons.Default.Star, contentDescription = "AI Enhance")
                        }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    val ts = timestampText.toIntOrNull()
                    onConfirm(text.trim(), ts)
                },
                enabled = text.isNotBlank(),
            ) { Text(if (initial != null) "Save" else "Add") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        },
    )
}
