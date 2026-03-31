package com.m4xon.zeta.android.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage

private val AvatarColors = listOf(
    Color(0xFF5B6BE8), Color(0xFF48B5A3), Color(0xFFE86B5B),
    Color(0xFFB56BE8), Color(0xFFE8B05B), Color(0xFF5BE87A),
)

private fun colorForName(name: String): Color {
    val idx = name.hashCode().and(0x7FFFFFFF) % AvatarColors.size
    return AvatarColors[idx]
}

@Composable
fun AvatarComposable(
    name: String,
    imageUrl: String?,
    size: Dp = 40.dp,
    modifier: Modifier = Modifier,
) {
    val initials = name
        .split(" ")
        .take(2)
        .mapNotNull { it.firstOrNull()?.uppercaseChar() }
        .joinToString("")
        .ifEmpty { "?" }

    if (!imageUrl.isNullOrBlank()) {
        AsyncImage(
            model = imageUrl,
            contentDescription = name,
            modifier = modifier
                .size(size)
                .clip(CircleShape),
        )
    } else {
        Box(
            contentAlignment = Alignment.Center,
            modifier = modifier
                .size(size)
                .clip(CircleShape)
                .background(colorForName(name)),
        ) {
            Text(
                text = initials,
                fontSize = (size.value * 0.38f).sp,
                fontWeight = FontWeight.SemiBold,
                color = Color.White,
            )
        }
    }
}
