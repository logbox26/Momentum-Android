package com.momentum.app.ui.theme

import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.graphics.Color
import com.momentum.app.domain.model.ThemeMode

data class MomentumColors(
    val primary: Color,
    val secondary: Color,
    val background: Color,
    val surface: Color,
    val surfaceElevated: Color,
    val textPrimary: Color,
    val textSecondary: Color,
    val textMuted: Color,
    val border: Color
)

val LocalMomentumColors = staticCompositionLocalOf {
    MomentumColors(
        primary = CalmBluePrimary,
        secondary = CalmBlueSecondary,
        background = CalmBlueBackground,
        surface = CalmBlueSurface,
        surfaceElevated = CalmBlueSurfaceElevated,
        textPrimary = CalmBlueTextPrimary,
        textSecondary = CalmBlueTextSecondary,
        textMuted = CalmBlueTextMuted,
        border = CalmBlueBorder
    )
}

@Composable
fun MomentumTheme(
    themeMode: ThemeMode = ThemeMode.CALM_BLUE,
    content: @Composable () -> Unit
) {
    val (colorScheme, momentumColors) = when (themeMode) {
        ThemeMode.CALM_BLUE -> Pair(
            lightColorScheme(
                primary = CalmBluePrimary,
                secondary = CalmBlueSecondary,
                background = CalmBlueBackground,
                surface = CalmBlueSurface,
                onPrimary = Color.White,
                onSurface = CalmBlueTextPrimary
            ),
            MomentumColors(
                primary = CalmBluePrimary,
                secondary = CalmBlueSecondary,
                background = CalmBlueBackground,
                surface = CalmBlueSurface,
                surfaceElevated = CalmBlueSurfaceElevated,
                textPrimary = CalmBlueTextPrimary,
                textSecondary = CalmBlueTextSecondary,
                textMuted = CalmBlueTextMuted,
                border = CalmBlueBorder
            )
        )
        ThemeMode.SAGE_GREEN -> Pair(
            lightColorScheme(
                primary = SageGreenPrimary,
                secondary = SageGreenSecondary,
                background = SageGreenBackground,
                surface = SageGreenSurface,
                onPrimary = Color.White,
                onSurface = SageGreenTextPrimary
            ),
            MomentumColors(
                primary = SageGreenPrimary,
                secondary = SageGreenSecondary,
                background = SageGreenBackground,
                surface = SageGreenSurface,
                surfaceElevated = SageGreenSurfaceElevated,
                textPrimary = SageGreenTextPrimary,
                textSecondary = SageGreenTextSecondary,
                textMuted = SageGreenTextMuted,
                border = SageGreenBorder
            )
        )
        ThemeMode.WARM_FOCUS -> Pair(
            lightColorScheme(
                primary = WarmFocusPrimary,
                secondary = WarmFocusSecondary,
                background = WarmFocusBackground,
                surface = WarmFocusSurface,
                onPrimary = Color.White,
                onSurface = WarmFocusTextPrimary
            ),
            MomentumColors(
                primary = WarmFocusPrimary,
                secondary = WarmFocusSecondary,
                background = WarmFocusBackground,
                surface = WarmFocusSurface,
                surfaceElevated = WarmFocusSurfaceElevated,
                textPrimary = WarmFocusTextPrimary,
                textSecondary = WarmFocusTextSecondary,
                textMuted = WarmFocusTextMuted,
                border = WarmFocusBorder
            )
        )
        ThemeMode.MODERN_SLATE -> Pair(
            lightColorScheme(
                primary = ModernSlatePrimary,
                secondary = ModernSlateSecondary,
                background = ModernSlateBackground,
                surface = ModernSlateSurface,
                onPrimary = Color.White,
                onSurface = ModernSlateTextPrimary
            ),
            MomentumColors(
                primary = ModernSlatePrimary,
                secondary = ModernSlateSecondary,
                background = ModernSlateBackground,
                surface = ModernSlateSurface,
                surfaceElevated = ModernSlateSurfaceElevated,
                textPrimary = ModernSlateTextPrimary,
                textSecondary = ModernSlateTextSecondary,
                textMuted = ModernSlateTextMuted,
                border = ModernSlateBorder
            )
        )
        ThemeMode.DEEP_FOCUS -> Pair(
            darkColorScheme(
                primary = DeepFocusPrimary,
                secondary = DeepFocusSecondary,
                background = DeepFocusBackground,
                surface = DeepFocusSurface,
                onPrimary = Color.Black,
                onSurface = DeepFocusTextPrimary
            ),
            MomentumColors(
                primary = DeepFocusPrimary,
                secondary = DeepFocusSecondary,
                background = DeepFocusBackground,
                surface = DeepFocusSurface,
                surfaceElevated = DeepFocusSurfaceElevated,
                textPrimary = DeepFocusTextPrimary,
                textSecondary = DeepFocusTextSecondary,
                textMuted = DeepFocusTextMuted,
                border = DeepFocusBorder
            )
        )
    }

    CompositionLocalProvider(LocalMomentumColors provides momentumColors) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography = MomentumTypography,
            content = content
        )
    }
}
