package com.m4xon.zeta.android.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// Brand colours (aligned with the Angular web app)
val ZetaBackground   = Color(0xFF0D0D0D)
val ZetaSurface      = Color(0xFF1A1A1A)
val ZetaSurfaceVar   = Color(0xFF262626)
val ZetaPrimary      = Color(0xFFFFFFFF)
val ZetaOnPrimary    = Color(0xFF0D0D0D)
val ZetaSecondary    = Color(0xFFAAAAAA)
val ZetaAccentYellow = Color(0xFFFFc700)  // "In review" status
val ZetaAccentGreen  = Color(0xFF4AAC5B)  // "Reviewed" status
val ZetaError        = Color(0xFFCF6679)

private val DarkColorScheme = darkColorScheme(
    primary            = ZetaPrimary,
    onPrimary          = ZetaOnPrimary,
    primaryContainer   = ZetaSurfaceVar,
    onPrimaryContainer = ZetaPrimary,
    secondary          = ZetaSecondary,
    onSecondary        = ZetaBackground,
    background         = ZetaBackground,
    onBackground       = ZetaPrimary,
    surface            = ZetaSurface,
    onSurface          = ZetaPrimary,
    surfaceVariant     = ZetaSurfaceVar,
    onSurfaceVariant   = ZetaSecondary,
    error              = ZetaError,
    onError            = ZetaBackground,
)

@Composable
fun ZetaTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        content = content,
    )
}
