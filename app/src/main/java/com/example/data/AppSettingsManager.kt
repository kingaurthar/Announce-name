package com.example.data

import android.content.Context
import android.content.SharedPreferences
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

data class AppSettings(
    val isServiceEnabled: Boolean = true,
    val announcePrefix: String = "Incoming call from ",
    val repeatCount: Int = 2,
    val speakUnknownNumbers: Boolean = true,
    val speechRate: Float = 1.0f,
    val speechPitch: Float = 1.0f,
    val onlyWhenBluetoothConnected: Boolean = true,
    val announceDelayMs: Long = 1000L
)

class AppSettingsManager(context: Context) {
    private val prefs: SharedPreferences =
        context.getSharedPreferences("app_settings_prefs", Context.MODE_PRIVATE)

    private val _settings = MutableStateFlow(loadSettings())
    val settings: StateFlow<AppSettings> = _settings.asStateFlow()

    private fun loadSettings(): AppSettings {
        return AppSettings(
            isServiceEnabled = prefs.getBoolean("service_enabled", true),
            announcePrefix = prefs.getString("announce_prefix", "Incoming call from ") ?: "Incoming call from ",
            repeatCount = prefs.getInt("repeat_count", 2),
            speakUnknownNumbers = prefs.getBoolean("speak_unknown", true),
            speechRate = prefs.getFloat("speech_rate", 1.0f),
            speechPitch = prefs.getFloat("speech_pitch", 1.0f),
            onlyWhenBluetoothConnected = prefs.getBoolean("only_bt_connected", true),
            announceDelayMs = prefs.getLong("announce_delay", 1000L)
        )
    }

    fun updateServiceEnabled(enabled: Boolean) {
        prefs.edit().putBoolean("service_enabled", enabled).apply()
        _settings.value = _settings.value.copy(isServiceEnabled = enabled)
    }

    fun updatePrefix(prefix: String) {
        prefs.edit().putString("announce_prefix", prefix).apply()
        _settings.value = _settings.value.copy(announcePrefix = prefix)
    }

    fun updateRepeatCount(count: Int) {
        prefs.edit().putInt("repeat_count", count).apply()
        _settings.value = _settings.value.copy(repeatCount = count)
    }

    fun updateSpeakUnknownNumbers(speak: Boolean) {
        prefs.edit().putBoolean("speak_unknown", speak).apply()
        _settings.value = _settings.value.copy(speakUnknownNumbers = speak)
    }

    fun updateSpeechRate(rate: Float) {
        prefs.edit().putFloat("speech_rate", rate).apply()
        _settings.value = _settings.value.copy(speechRate = rate)
    }

    fun updateSpeechPitch(pitch: Float) {
        prefs.edit().putFloat("speech_pitch", pitch).apply()
        _settings.value = _settings.value.copy(speechPitch = pitch)
    }

    fun updateOnlyWhenBluetoothConnected(onlyBt: Boolean) {
        prefs.edit().putBoolean("only_bt_connected", onlyBt).apply()
        _settings.value = _settings.value.copy(onlyWhenBluetoothConnected = onlyBt)
    }

    fun updateAnnounceDelay(delayMs: Long) {
        prefs.edit().putLong("announce_delay", delayMs).apply()
        _settings.value = _settings.value.copy(announceDelayMs = delayMs)
    }
}
