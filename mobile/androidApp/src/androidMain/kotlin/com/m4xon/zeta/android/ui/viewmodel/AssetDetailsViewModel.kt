package com.m4xon.zeta.android.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.m4xon.zeta.model.Asset
import com.m4xon.zeta.model.Review
import com.m4xon.zeta.repository.AssetRepository
import com.m4xon.zeta.repository.ReviewRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

data class AssetDetailsData(
    val asset: Asset,
    val selectedVideoIndex: Int = 0,
    val reviews: List<Review> = emptyList(),
    val reviewsLoading: Boolean = true,
)

sealed interface AssetDetailsUiState {
    data object Loading : AssetDetailsUiState
    data class Success(val data: AssetDetailsData) : AssetDetailsUiState
    data class Error(val message: String) : AssetDetailsUiState
}

// One-shot action result for write operations (shown as snackbar)
sealed interface ReviewActionState {
    data object Idle : ReviewActionState
    data object Loading : ReviewActionState
    data object Success : ReviewActionState
    data class Error(val message: String) : ReviewActionState
}

class AssetDetailsViewModel(
    private val assetId: String,
    private val assetRepository: AssetRepository,
    private val reviewRepository: ReviewRepository,
) : ViewModel() {

    private val _state = MutableStateFlow<AssetDetailsUiState>(AssetDetailsUiState.Loading)
    val state: StateFlow<AssetDetailsUiState> = _state

    private val _reviewAction = MutableStateFlow<ReviewActionState>(ReviewActionState.Idle)
    val reviewAction: StateFlow<ReviewActionState> = _reviewAction

    // Enhance state — holds the in-progress or result text
    private val _enhancedText = MutableStateFlow<String?>(null)
    val enhancedText: StateFlow<String?> = _enhancedText

    private val _enhancing = MutableStateFlow(false)
    val enhancing: StateFlow<Boolean> = _enhancing

    init { load() }

    fun refresh() = load()

    fun selectVideo(index: Int) {
        val current = (_state.value as? AssetDetailsUiState.Success)?.data ?: return
        val videos = current.asset.videos ?: return
        if (index !in videos.indices) return
        val videoId = videos[index].id
        _state.value = AssetDetailsUiState.Success(
            current.copy(selectedVideoIndex = index, reviewsLoading = true, reviews = emptyList())
        )
        loadReviews(videoId)
    }

    fun createReview(content: String, timestampSeconds: Int? = null) {
        val videoId = currentVideoId() ?: return
        viewModelScope.launch {
            _reviewAction.value = ReviewActionState.Loading
            try {
                reviewRepository.create(videoId, content, timestampSeconds)
                _reviewAction.value = ReviewActionState.Success
                refreshReviews()
            } catch (e: Exception) {
                _reviewAction.value = ReviewActionState.Error(e.message ?: "Failed to create review")
            }
        }
    }

    fun updateReview(reviewId: String, content: String) {
        val videoId = currentVideoId() ?: return
        viewModelScope.launch {
            _reviewAction.value = ReviewActionState.Loading
            try {
                reviewRepository.update(videoId, reviewId, content)
                _reviewAction.value = ReviewActionState.Success
                refreshReviews()
            } catch (e: Exception) {
                _reviewAction.value = ReviewActionState.Error(e.message ?: "Failed to update review")
            }
        }
    }

    fun deleteReview(reviewId: String) {
        val videoId = currentVideoId() ?: return
        viewModelScope.launch {
            _reviewAction.value = ReviewActionState.Loading
            try {
                reviewRepository.delete(videoId, reviewId)
                _reviewAction.value = ReviewActionState.Success
                refreshReviews()
            } catch (e: Exception) {
                _reviewAction.value = ReviewActionState.Error(e.message ?: "Failed to delete review")
            }
        }
    }

    fun enhanceText(text: String) {
        viewModelScope.launch {
            _enhancing.value = true
            try {
                _enhancedText.value = reviewRepository.enhance(text)
            } catch (e: Exception) {
                _reviewAction.value = ReviewActionState.Error(e.message ?: "AI enhance failed")
            } finally {
                _enhancing.value = false
            }
        }
    }

    fun clearEnhancedText() { _enhancedText.value = null }

    fun clearReviewAction() { _reviewAction.value = ReviewActionState.Idle }

    private fun currentVideoId(): String? {
        val data = (_state.value as? AssetDetailsUiState.Success)?.data ?: return null
        return data.asset.videos?.getOrNull(data.selectedVideoIndex)?.id
    }

    private fun refreshReviews() {
        val videoId = currentVideoId() ?: return
        loadReviews(videoId)
    }

    private fun load() {
        viewModelScope.launch {
            _state.value = AssetDetailsUiState.Loading
            try {
                val asset = assetRepository.getById(assetId)
                val firstVideoId = asset.videos?.firstOrNull()?.id
                _state.value = AssetDetailsUiState.Success(
                    AssetDetailsData(asset = asset, reviewsLoading = firstVideoId != null)
                )
                if (firstVideoId != null) loadReviews(firstVideoId)
            } catch (e: Exception) {
                _state.value = AssetDetailsUiState.Error(e.message ?: "Failed to load asset")
            }
        }
    }

    private fun loadReviews(videoId: String) {
        viewModelScope.launch {
            try {
                val reviews = reviewRepository.getReviews(videoId)
                val current = (_state.value as? AssetDetailsUiState.Success)?.data ?: return@launch
                _state.value = AssetDetailsUiState.Success(
                    current.copy(reviews = reviews, reviewsLoading = false)
                )
            } catch (e: Exception) {
                val current = (_state.value as? AssetDetailsUiState.Success)?.data ?: return@launch
                _state.value = AssetDetailsUiState.Success(
                    current.copy(reviews = emptyList(), reviewsLoading = false)
                )
            }
        }
    }
}
