package com.m4xon.zeta.android.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.m4xon.zeta.model.User
import com.m4xon.zeta.repository.GroupRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

sealed interface GroupDetailsUiState {
    data object Loading : GroupDetailsUiState
    data class Success(val users: List<User>) : GroupDetailsUiState
    data class Error(val message: String) : GroupDetailsUiState
}

sealed interface InviteActionState {
    data object Idle : InviteActionState
    data object Loading : InviteActionState
    data object Success : InviteActionState
    data class Error(val message: String) : InviteActionState
}

class GroupDetailsViewModel(
    private val groupId: String,
    private val groupRepository: GroupRepository,
) : ViewModel() {

    private val _state = MutableStateFlow<GroupDetailsUiState>(GroupDetailsUiState.Loading)
    val state: StateFlow<GroupDetailsUiState> = _state

    private val _inviteAction = MutableStateFlow<InviteActionState>(InviteActionState.Idle)
    val inviteAction: StateFlow<InviteActionState> = _inviteAction

    init { load() }

    fun refresh() = load()

    fun inviteUser(email: String) {
        viewModelScope.launch {
            _inviteAction.value = InviteActionState.Loading
            try {
                groupRepository.invite(groupId, email)
                _inviteAction.value = InviteActionState.Success
            } catch (e: Exception) {
                _inviteAction.value = InviteActionState.Error(e.message ?: "Failed to send invite")
            }
        }
    }

    fun clearInviteAction() { _inviteAction.value = InviteActionState.Idle }

    private fun load() {
        viewModelScope.launch {
            _state.value = GroupDetailsUiState.Loading
            try {
                _state.value = GroupDetailsUiState.Success(groupRepository.getUsers(groupId))
            } catch (e: Exception) {
                _state.value = GroupDetailsUiState.Error(e.message ?: "Failed to load members")
            }
        }
    }
}
