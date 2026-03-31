package com.m4xon.zeta.android.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.valentinilk.shimmer.shimmer
import androidx.compose.foundation.background
import androidx.compose.ui.graphics.Color

@Composable
fun SkeletonBox(
    width: Dp = Dp.Unspecified,
    height: Dp,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .then(if (width != Dp.Unspecified) Modifier.width(width) else Modifier.fillMaxWidth())
            .height(height)
            .shimmer()
            .clip(RoundedCornerShape(6.dp))
            .background(Color(0xFF2A2A2A)),
    )
}

@Composable
fun SkeletonCard(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier.padding(8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        SkeletonBox(height = 140.dp)
        SkeletonBox(height = 16.dp, width = 160.dp)
        SkeletonBox(height = 12.dp, width = 80.dp)
    }
}
