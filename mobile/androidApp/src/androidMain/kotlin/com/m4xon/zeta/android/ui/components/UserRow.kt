package com.m4xon.zeta.android.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.m4xon.zeta.model.User

private fun roleLabel(role: String?): String = when (role) {
    "admin"   -> "Admin"
    "coach"   -> "Coach"
    "student" -> "Student"
    else      -> role?.replaceFirstChar { it.uppercase() } ?: ""
}

private fun roleColor(role: String?): Color = when (role) {
    "admin"  -> Color(0xFF5B6BE8)
    "coach"  -> Color(0xFF48B5A3)
    else     -> Color(0xFF555555)
}

@Composable
fun UserRow(
    user: User,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        AvatarComposable(
            name = "${user.firstName} ${user.lastName}",
            imageUrl = user.profilePictureUrl.takeIf { it.isNotBlank() },
            size = 40.dp,
        )
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = "${user.firstName} ${user.lastName}",
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                color = MaterialTheme.colorScheme.onSurface,
            )
            Text(
                text = user.email,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
        val role = user.role
        if (!role.isNullOrBlank()) {
            Text(
                text = roleLabel(role),
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold,
                color = Color.White,
                modifier = Modifier
                    .background(roleColor(role), RoundedCornerShape(4.dp))
                    .padding(horizontal = 8.dp, vertical = 3.dp),
            )
        }
    }
}
