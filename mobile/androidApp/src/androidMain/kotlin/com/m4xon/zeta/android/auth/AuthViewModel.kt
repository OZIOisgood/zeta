package com.m4xon.zeta.android.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.m4xon.zeta.auth.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

sealed interface AuthState {
    data object Loading : AuthState
    data class LoggedIn(val role: String) : AuthState
    data object LoggedOut : AuthState
    data class Error(val message: String) : AuthState
}

class AuthViewModel(
    private val authRepository: AuthRepository,
) : ViewModel() {

    private val _state = MutableStateFlow<AuthState>(AuthState.Loading)
    val state: StateFlow<AuthState> = _state

    init {
        checkSession()
    }

    private fun checkSession() {
        val token = authRepository.getSavedToken()
        val role = authRepository.getSavedRole() ?: ""
        _state.value = if (token != null) AuthState.LoggedIn(role) else AuthState.LoggedOut
    }

    /** Called by MainActivity after the OAuth deep link returns a code. */
    fun onAuthCallback(code: String) {
        viewModelScope.launch {
            _state.value = AuthState.Loading
            try {
                val response = authRepository.exchangeCodeFull(code)
                authRepository.saveToken(response.token)
                val role = response.user.role ?: ""
                authRepository.saveRole(role)
                _state.value = AuthState.LoggedIn(role)
            } catch (e: Exception) {
                _state.value = AuthState.Error(e.message ?: "Authentication failed")
            }
        }
    }

    fun logout() {
        authRepository.clearToken()
        authRepository.clearRole()
        _state.value = AuthState.LoggedOut
    }
}
