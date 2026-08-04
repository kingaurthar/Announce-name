package com.example.service

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioManager
import android.os.Build
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.util.Log
import java.util.Locale

class TTSAnnouncer(private val context: Context) : TextToSpeech.OnInitListener {

    private var tts: TextToSpeech? = null
    private var isInitialized = false
    private var pendingSpeech: Triple<String, Float, Float>? = null

    init {
        tts = TextToSpeech(context.applicationContext, this)
    }

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            val result = tts?.setLanguage(Locale.getDefault())
            if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
                tts?.setLanguage(Locale.US)
            }

            // Route TTS audio appropriately
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                val audioAttributes = AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ASSISTANCE_ACCESSIBILITY)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build()
                tts?.setAudioAttributes(audioAttributes)
            }

            isInitialized = true
            Log.d("TTSAnnouncer", "TTS Initialized successfully")

            pendingSpeech?.let { (text, rate, pitch) ->
                speak(text, rate, pitch)
                pendingSpeech = null
            }
        } else {
            Log.e("TTSAnnouncer", "TTS Initialization failed with status $status")
        }
    }

    fun speak(text: String, rate: Float = 1.0f, pitch: Float = 1.0f, onDone: (() -> Unit)? = null) {
        if (!isInitialized) {
            pendingSpeech = Triple(text, rate, pitch)
            return
        }

        try {
            tts?.apply {
                setSpeechRate(rate.coerceIn(0.5f, 2.0f))
                setPitch(pitch.coerceIn(0.5f, 2.0f))

                if (onDone != null) {
                    setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                        override fun onStart(utteranceId: String?) {}
                        override fun onDone(utteranceId: String?) {
                            onDone()
                        }

                        @Deprecated("Deprecated in Java")
                        override fun onError(utteranceId: String?) {
                            onDone()
                        }
                    })
                }

                val utteranceId = "CallerAnnouncerUtterance_${System.currentTimeMillis()}"
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    val params = Bundle().apply {
                        putInt(TextToSpeech.Engine.KEY_PARAM_STREAM, AudioManager.STREAM_MUSIC)
                    }
                    speak(text, TextToSpeech.QUEUE_FLUSH, params, utteranceId)
                } else {
                    @Suppress("DEPRECATION")
                    val map = HashMap<String, String>().apply {
                        put(TextToSpeech.Engine.KEY_PARAM_STREAM, AudioManager.STREAM_MUSIC.toString())
                        put(TextToSpeech.Engine.KEY_PARAM_UTTERANCE_ID, utteranceId)
                    }
                    @Suppress("DEPRECATION")
                    speak(text, TextToSpeech.QUEUE_FLUSH, map)
                }
            }
        } catch (e: Exception) {
            Log.e("TTSAnnouncer", "Error executing speech", e)
        }
    }

    fun stop() {
        try {
            tts?.stop()
        } catch (e: Exception) {
            Log.e("TTSAnnouncer", "Error stopping TTS", e)
        }
    }

    fun shutdown() {
        try {
            tts?.stop()
            tts?.shutdown()
            tts = null
            isInitialized = false
        } catch (e: Exception) {
            Log.e("TTSAnnouncer", "Error shutting down TTS", e)
        }
    }
}
