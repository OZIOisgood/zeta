package com.m4xon.zeta.android.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.m4xon.zeta.model.Asset
import com.m4xon.zeta.repository.AssetRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

sealed interface HomeUiState {
    data object Loading : HomeUiState
    data class Success(val assets: List<Asset>) : HomeUiState
    data class Error(val message: String) : HomeUiState
}

class HomeViewModel(
    private val assetRepository: AssetRepository,
) : ViewModel() {

    private val _state = MutableStateFlow<HomeUiState>(HomeUiState.Loading)
    val state: StateFlow<HomeUiState> = _state

    init {
        load()
    }

    fun refresh() = load()

    private fun load() {
        viewModelScope.launch {
            _state.value = HomeUiState.Loading
            try {
                _state.value = HomeUiState.Success(assetRepository.getAll())
            } catch (e: Exception) {
                _state.value = HomeUiState.Error(e.message ?: "Failed to load assets")
            }
        }
    }
}
