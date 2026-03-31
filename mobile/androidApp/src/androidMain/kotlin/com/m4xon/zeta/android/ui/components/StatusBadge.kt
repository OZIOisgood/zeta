package com.m4xon.zeta.android.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.m4xon.zeta.android.ui.theme.ZetaAccentGreen
import com.m4xon.zeta.android.ui.theme.ZetaAccentYellow

@Composable
fun StatusBadge(status: String, modifier: Modifier = Modifier) {
    val (label, bg, fg) = when (status.lowercase()) {
        "reviewed"  -> Triple("Reviewed",  ZetaAccentGreen,  Color.White)
        "in_review",
        "in review" -> Triple("In review", ZetaAccentYellow, Color.Black)
        else        -> Triple(status,      Color(0xFF444444), Color(0xFFBBBBBB))
    }

    Text(
        text = label,
        fontSize = 11.sp,
        fontWeight = FontWeight.SemiBold,
        color = fg,
        modifier = modifier
            .background(bg, RoundedCornerShape(4.dp))
            .padding(horizontal = 8.dp, vertical = 3.dp),
    )
}
