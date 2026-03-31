package com.m4xon.zeta.android.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.m4xon.zeta.model.Group
import com.m4xon.zeta.repository.GroupRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

sealed interface GroupsUiState {
    data object Loading : GroupsUiState
    data class Success(val groups: List<Group>) : GroupsUiState
    data class Error(val message: String) : GroupsUiState
}

sealed interface GroupActionState {
    data object Idle : GroupActionState
    data object Loading : GroupActionState
    data object Success : GroupActionState
    data class Error(val message: String) : GroupActionState
}

class GroupsViewModel(
    private val groupRepository: GroupRepository,
) : ViewModel() {

    private val _state = MutableStateFlow<GroupsUiState>(GroupsUiState.Loading)
    val state: StateFlow<GroupsUiState> = _state

    private val _action = MutableStateFlow<GroupActionState>(GroupActionState.Idle)
    val action: StateFlow<GroupActionState> = _action

    init { load() }

    fun refresh() = load()

    fun createGroup(name: String, avatar: String? = null) {
        viewModelScope.launch {
            _action.value = GroupActionState.Loading
            try {
                groupRepository.create(name, avatar)
                _action.value = GroupActionState.Success
                load()
            } catch (e: Exception) {
                _action.value = GroupActionState.Error(e.message ?: "Failed to create group")
            }
        }
    }

    fun clearAction() { _action.value = GroupActionState.Idle }

    private fun load() {
        viewModelScope.launch {
            _state.value = GroupsUiState.Loading
            try {
                _state.value = GroupsUiState.Success(groupRepository.getAll())
            } catch (e: Exception) {
                _state.value = GroupsUiState.Error(e.message ?: "Failed to load groups")
            }
        }
    }
}
