package com.m4xon.zeta.android.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.m4xon.zeta.model.InvitationInfo
import com.m4xon.zeta.repository.GroupRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

sealed interface InviteAcceptUiState {
    data object Loading : InviteAcceptUiState
    data class Ready(val info: InvitationInfo) : InviteAcceptUiState
    data object Accepting : InviteAcceptUiState
    data class Error(val message: String) : InviteAcceptUiState
}

class InviteAcceptViewModel(
    private val code: String,
    private val groupRepository: GroupRepository,
) : ViewModel() {

    private val _state = MutableStateFlow<InviteAcceptUiState>(InviteAcceptUiState.Loading)
    val state: StateFlow<InviteAcceptUiState> = _state

    init { loadInfo() }

    private fun loadInfo() {
        viewModelScope.launch {
            _state.value = InviteAcceptUiState.Loading
            try {
                _state.value = InviteAcceptUiState.Ready(groupRepository.getInvitationInfo(code))
            } catch (e: Exception) {
                _state.value = InviteAcceptUiState.Error(e.message ?: "Invalid or expired invitation")
            }
        }
    }

    fun accept(onSuccess: (groupId: String) -> Unit) {
        viewModelScope.launch {
            _state.value = InviteAcceptUiState.Accepting
            try {
                val response = groupRepository.acceptInvitation(code)
                onSuccess(response.groupId)
            } catch (e: Exception) {
                _state.value = InviteAcceptUiState.Error(e.message ?: "Failed to accept invitation")
            }
        }
    }
}
